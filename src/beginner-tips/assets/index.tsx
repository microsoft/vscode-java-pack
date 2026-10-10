// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createRoot } from 'react-dom/client';
import BeginnerTips from "./BeginnerTips";

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<BeginnerTips requiredJdkVersion={Number(container.dataset.requiredJdkVersion)} />);
