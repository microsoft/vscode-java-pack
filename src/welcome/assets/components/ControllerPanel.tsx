// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { richText } from "../../../l10n/richText";
import * as l10n from "@vscode/l10n";
import { setWelcomeVisibility } from "../utils";

interface ControllerPanelProps {
    showWhenUsingJava?: boolean;
}

export default function ControllerPanel({ showWhenUsingJava }: ControllerPanelProps) {
    return (
        <div>
            <label>{richText(l10n.t("{0} Show Help Center when using Java"), [<input
                    type="checkbox"
                    defaultChecked={showWhenUsingJava}
                    onChange={toggleVisibility}
                />])}</label>
        </div>
    );
}

function toggleVisibility(event: React.ChangeEvent<HTMLInputElement>) {
    setWelcomeVisibility(event.target.checked);
}
