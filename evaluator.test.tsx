import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { FEATURE_SPECS } from './schema.ts';
import { PROVINCE_RECORDS, ZONE_PRESETS } from './data.ts';
import predictHandler from './predict.ts';
import { callHandler } from './testSupport.ts';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement, Node: dom.window.Node,
  MutationObserver: dom.window.MutationObserver, IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
const { render, screen, cleanup, waitFor, act, fireEvent } = await import('@testing-library/react');
const { default: userEvent } = await import('@testing-library/user-event');
const { SinglePageEvaluator } = await import('./SinglePageEvaluator.tsx');
const originalFetch = globalThis.fetch;

function apiResponse(body: string) {
  const result = callHandler(predictHandler, body);
  return new Response(JSON.stringify(result.body), { status: result.status, headers: { 'Content-Type': 'application/json' } });
}
function renderForm() {
  return render(<SinglePageEvaluator specs={FEATURE_SPECS} presets={ZONE_PRESETS} provinces={PROVINCE_RECORDS} />);
}
const rate = () => screen.getByTestId('estimated-rate').textContent;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; });

test('formulario real: provincia actualiza referencia y resultado; editar tasa conserva el dato propio', async () => {
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return apiResponse(String(init?.body));
  };
  const user = userEvent.setup({ document: dom.window.document });
  renderForm();
  await user.click(screen.getByRole('button', { name: 'Mis propios datos' }));
  await waitFor(() => assert.ok(screen.queryByTestId('estimated-rate')));
  const before = rate();
  await user.selectOptions(screen.getByLabelText('Provincia'), 'Salta');
  assert.equal(screen.queryByTestId('estimated-rate'), null, 'no debe conservar un resultado viejo con el nombre nuevo');
  assert.match(screen.getByTestId('history-source').textContent!, /Salta: 1,81%/);
  await waitFor(() => assert.ok(screen.queryByTestId('estimated-rate')));
  assert.notEqual(rate(), before);
  assert.equal(requests.at(-1)?.provincia, 'Salta');
  assert.equal(requests.at(-1)?.usarReferenciaProvincial, true);

  fireEvent.change(screen.getByLabelText('Porcentaje de abandono año anterior'), { target: { value: '3' } });
  await waitFor(() => assert.ok(screen.queryByTestId('estimated-rate')));
  const manual = rate();
  assert.equal((screen.getByRole('checkbox', { name: 'Usar referencia provincial de 2022' }) as HTMLInputElement).checked, false);
  await user.selectOptions(screen.getByLabelText('Provincia'), 'Buenos Aires');
  await waitFor(() => assert.ok(screen.queryByTestId('estimated-rate')));
  assert.equal(rate(), manual);
  assert.equal(requests.at(-1)?.tasa_abandono_2022, 3);
  assert.match(screen.getByTestId('history-source').textContent!, /tasa propia/);

  await user.click(screen.getByRole('checkbox', { name: 'Usar referencia provincial de 2022' }));
  await waitFor(() => assert.ok(screen.queryByTestId('estimated-rate')));
  assert.equal(rate(), before);
});

test('una respuesta lenta de la provincia anterior nunca reemplaza la selección actual', async () => {
  let resolveOld: ((response: Response) => void) | undefined;
  let oldBody = '';
  globalThis.fetch = async (_url, init) => {
    const body = String(init?.body);
    if (JSON.parse(body).provincia === 'Misiones') {
      oldBody = body;
      // Simula un transporte que ignora abort; también debe funcionar la guarda de identidad.
      return new Promise<Response>((resolve) => { resolveOld = resolve; });
    }
    return apiResponse(body);
  };
  const user = userEvent.setup({ document: dom.window.document });
  renderForm();
  await user.click(screen.getByRole('button', { name: 'Mis propios datos' }));
  await waitFor(() => assert.ok(screen.queryByTestId('estimated-rate')));
  await user.selectOptions(screen.getByLabelText('Provincia'), 'Misiones');
  await waitFor(() => assert.ok(resolveOld));
  await user.selectOptions(screen.getByLabelText('Provincia'), 'Chubut');
  await waitFor(() => assert.ok(screen.queryByTestId('estimated-rate')));
  const current = rate();
  await act(async () => { resolveOld!(apiResponse(oldBody)); });
  assert.equal(rate(), current);
  assert.match(screen.getByTestId('history-source').textContent!, /Chubut/);
});

test('si falla la API al cambiar de provincia muestra el error sin reutilizar la tasa anterior', async () => {
  globalThis.fetch = async (_url, init) => {
    if (JSON.parse(String(init?.body)).provincia === 'Salta') throw new TypeError('offline');
    return apiResponse(String(init?.body));
  };
  const user = userEvent.setup({ document: dom.window.document });
  renderForm();
  await user.click(screen.getByRole('button', { name: 'Mis propios datos' }));
  await waitFor(() => assert.ok(screen.queryByTestId('estimated-rate')));
  await user.selectOptions(screen.getByLabelText('Provincia'), 'Salta');
  await waitFor(() => assert.match(screen.getByRole('alert').textContent!, /No se pudo conectar/));
  assert.equal(screen.queryByTestId('estimated-rate'), null);
});
