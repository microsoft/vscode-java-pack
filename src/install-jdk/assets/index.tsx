// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createRoot } from 'react-dom/client';
import App from './App';
import { Provider } from 'react-redux';
import store from './app/store';

const root = createRoot(document.getElementById('root')!);
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
