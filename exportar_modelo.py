"""Exporta el Random Forest de la Entrega 3 (modelo_abandono.joblib) a random_forest.json.

Uso (desde la raíz del repo, con los CSV y el .joblib en la carpeta indicada):
    python exportar_modelo.py RUTA_DATOS RUTA_JOBLIB

RUTA_DATOS debe tener dataset_unificado.csv, 2023_Trayectoria_agregada.csv y 2023_Matricula_agregada.csv.
No reentrena nada: copia los árboles, umbrales y medianas que guardó el notebook. La parte de
construcción de variables es la misma del notebook (secciones 3 y 5); solo se usa para armar la
distribución nacional (percentiles) y los casos de prueba de paridad.
"""
import os, sys
DATOS, JOBLIB = sys.argv[1], sys.argv[2]
REPO = os.path.dirname(os.path.abspath(__file__))
os.chdir(DATOS)
# ---------- Construcción de X (copiado del notebook de la Entrega 3) ----------
# En Colab, si los archivos están en Drive:
# from google.colab import drive; drive.mount('/content/drive')
# import os; os.chdir('/content/drive/MyDrive/<carpeta>')

import json, sys, subprocess, unicodedata, warnings, platform
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib, sklearn
from scipy.stats import spearmanr
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
from sklearn.metrics import (mean_absolute_error, r2_score, confusion_matrix,
                             precision_score, recall_score, f1_score, accuracy_score)
from sklearn.inspection import permutation_importance
warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', category=pd.errors.PerformanceWarning)
warnings.filterwarnings('ignore', message='An input array is constant')

SEED = 42

print('Python', platform.python_version(), '| scikit-learn', sklearn.__version__)

def normalizar(serie):
    return serie.astype(str).map(lambda x: unicodedata.normalize('NFKD', x)
                                 .encode('ascii', 'ignore').decode().upper().strip())

CLAVE = ['provincia', 'departamento', 'sector', 'ambito']
CLAVE_N = [c + '_n' for c in CLAVE]

base = pd.read_csv('dataset_unificado.csv', dtype={'departamento': str})
tray22 = pd.read_csv('2023_Trayectoria_agregada.csv', sep=';', encoding='latin1',
                     dtype={'departamento': str}, na_values=[' ', ''])
mat23 = pd.read_csv('2023_Matricula_agregada.csv', sep=';', encoding='latin1',
                    dtype={'departamento': str}, na_values=[' ', ''])
for df in (base, tray22, mat23):
    for c in CLAVE:
        df[c + '_n'] = normalizar(df[c])

print(f'Base 2023: {base.shape}  |  Trayectoria ciclo 2022: {tray22.shape}  |  Matrícula 2023: {mat23.shape}')

G = [str(i) for i in range(1, 13)]          # años de estudio 1° a 12°
SEC = ['8', '9', '10', '11', '12']          # secundaria (7° es primaria o secundaria según la provincia)

def suma(df, columnas):
    return df[columnas].apply(pd.to_numeric, errors='coerce').sum(axis=1, min_count=1)

# El total de entrados de 10° venía mal rotulado en la fuente (entrega 2, sección 3.2)
base = base.rename(columns={'tray_matricula_entrados_mujeres_10': 'tray_matricula_entrados_10',
                            'tray_matricula_entrados_mujeres_10_1': 'tray_matricula_entrados_mujeres_10'})

base['matricula_inicial'] = suma(base, [f'tray_matricula_inicial_{g}' for g in G])
base['matricula_expuesta'] = base['matricula_inicial'] + suma(base, [f'tray_matricula_entrados_{g}' for g in G])
base['salidos_sin_pase'] = suma(base, [f'tray_salidos_sin_pase_{g}' for g in G])

n0 = len(base)
df = base[base['depto_valido'] & (base['matricula_expuesta'] >= 100)].copy()
df['tasa_abandono_pct'] = 100 * df['salidos_sin_pase'] / df['matricula_expuesta']
df['y_log'] = np.log1p(df['tasa_abandono_pct'])
print(f'Zonas: {n0} → {len(df)} (sin departamentos enmascarados y con al menos 100 alumnos)')
print(f"Tasa de abandono: mediana {df.tasa_abandono_pct.median():.2f}%, media {df.tasa_abandono_pct.mean():.2f}%")

X = pd.DataFrame(index=df.index)
X['sector_privado'] = (df['sector'] == 'Privado').astype(int)
X['ambito_rural'] = (df['ambito'] == 'Rural').astype(int)
X['es_conurbano'] = df['es_conurbano'].astype(int)
X['log_matricula_inicial'] = np.log10(df['matricula_inicial'])
X['pct_matricula_8a12'] = suma(df, [f'tray_matricula_inicial_{g}' for g in SEC]) / df['matricula_inicial']
X['pct_mujeres'] = suma(df, [f'tray_matricula_inicial_mujeres_{g}' for g in G]) / df['matricula_inicial']

for c in ['appri_pct_nse_bajo', 'appri_pct_madre_sin_sec', 'appri_pct_sin_internet', 'appri_pct_sin_agua_potable',
          'car_pri_pct_cargos_vacantes', 'car_sec_pct_hs_vacantes', 'car_sec_pct_hs_fuera_planta']:
    X[c] = df[c]

# Población: la fuente no registra ceros, un vacío en una fila con datos significa "no hay casos" (entrega 2, 3.4)
pob = ['pob_tasa_alumnos_con_almuerzo', 'pob_tasa_discapacidad_prim_sec', 'pob_tasa_indigena_prim_sec']
con_datos_pob = df[[c for c in df.columns if c.startswith('pob_')]].notna().any(axis=1)
for c in pob:
    X[c] = df[c].where(df[c].notna() | ~con_datos_pob, 0)
X['pob_tasa_alumnos_con_almuerzo'] = X['pob_tasa_alumnos_con_almuerzo'].clip(upper=1)
print('Predictores de contexto:', X.shape[1])

prev = tray22[CLAVE_N].copy()
exp22 = suma(tray22, [f'inicial_{g}' for g in G]) + suma(tray22, [f'entrados_{g}' for g in G])
exp22_sec = suma(tray22, [f'inicial_{g}' for g in SEC]) + suma(tray22, [f'entrados_{g}' for g in SEC])
prev['tasa_abandono_2022'] = (100 * suma(tray22, [f'ssp_{g}' for g in G]) / exp22).where(exp22 > 0)
prev['tasa_abandono_2022_sec'] = (100 * suma(tray22, [f'ssp_{g}' for g in SEC]) / exp22_sec).where(exp22_sec > 0)

m23 = mat23[CLAVE_N].copy()
mat_total = suma(mat23, [f'_{g}' for g in G])
m23['pct_sobreedad_2023'] = suma(mat23, [f's_{g}' for g in G]) / mat_total
m23['pct_repitentes_2023'] = suma(mat23, [f'r_{g}' for g in G]) / mat_total

claves = df[CLAVE_N].reset_index()
nuevas = (claves.merge(prev, on=CLAVE_N, how='left')
                .merge(m23, on=CLAVE_N, how='left').set_index('index'))
for c in ['tasa_abandono_2022', 'tasa_abandono_2022_sec', 'pct_sobreedad_2023', 'pct_repitentes_2023']:
    X[c] = nuevas[c]

print(f"Zonas con tasa del ciclo anterior: {X['tasa_abandono_2022'].notna().sum()} de {len(X)}")
print(f"Zonas con matrícula 2023:          {X['pct_sobreedad_2023'].notna().sum()} de {len(X)}")
print(f'Total de predictores: {X.shape[1]}')


y = df['y_log']
grupos = df['provincia']
gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED)
idx_tr, idx_te = next(gss.split(X, y, groups=grupos))
X_tr, X_te, y_tr, y_te = X.iloc[idx_tr], X.iloc[idx_te], y.iloc[idx_tr], y.iloc[idx_te]
g_tr = grupos.iloc[idx_tr]
assert set(g_tr).isdisjoint(set(grupos.iloc[idx_te]))
print(f'Entrenamiento: {len(idx_tr)} zonas de {g_tr.nunique()} provincias')
print(f'Prueba:        {len(idx_te)} zonas de {grupos.iloc[idx_te].nunique()} provincias → {sorted(grupos.iloc[idx_te].unique())}')

# ---------- Exportación ----------
import joblib, json
p = joblib.load(JOBLIB)
pipe = p['pipeline']; COLS = p['variables']
imp = pipe.named_steps['imputar']; rf = pipe.named_steps['modelo']
# chequeo: el paquete reproduce la prueba del notebook
pred_te = a_pct(pipe.predict(X_te[COLS])) if 'a_pct' in dir() else np.clip(np.expm1(pipe.predict(X_te[COLS])),0,100)
print('MAE test recalculado:', round(mean_absolute_error(np.expm1(y_te), pred_te),4), '| guardado:', p['metricas_prueba'])
ind = [int(i) for i in imp.indicator_.features_]
trees = []
for est in rf.estimators_:
    t = est.tree_
    trees.append({'l': t.children_left.tolist(), 'r': t.children_right.tolist(), 'f': t.feature.tolist(),
                  't': [float(v) for v in t.threshold], 'v': [float(v) for v in t.value[:, 0, 0]]})
pred_all = np.clip(np.expm1(pipe.predict(X[COLS])), 0, 100)
modelo = {
  'fuente': 'modelo_abandono.joblib (Entrega 3) exportado sin reentrenar',
  'variables': COLS, 'medianas_imputacion': [float(v) for v in imp.statistics_],
  'indicadores_faltante': ind, 'n_features_modelo': int(rf.n_features_in_),
  'umbral_alto_riesgo_pct': p['umbral_alto_riesgo_pct'], 'metricas_prueba': p['metricas_prueba'],
  'provincias_entrenamiento': p['provincias_entrenamiento'], 'provincias_prueba': p['provincias_prueba'],
  'hiperparametros': {k: rf.get_params()[k] for k in ['n_estimators','min_samples_leaf','max_features','random_state']},
  'versiones': p['versiones'],
  'referencia_nacional_pred_pct': sorted(round(float(v),4) for v in pred_all),
  'trees': trees,
}
json.dump(modelo, open(os.path.join(REPO,'random_forest.json'),'w'), separators=(',',':'))
# casos de verificación (zonas reales + con faltantes) para test de paridad
rng = np.random.default_rng(0)
idx = rng.choice(len(X), 60, replace=False)
casos = X.iloc[idx][COLS].copy()
casos.iloc[:5, [0,5,9,18]] = np.nan
casos['esperado_pct'] = np.clip(np.expm1(pipe.predict(casos[COLS])), 0, 100)
json.dump([{k:(None if pd.isna(v) else float(v)) for k,v in r.items()} for r in casos.to_dict('records')], open(os.path.join(REPO,'casos_paridad.json'),'w'))
print('Listo: random_forest.json y casos_paridad.json')
