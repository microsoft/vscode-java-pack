// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { setWelcomeVisibility } from "../utils";

interface ControllerPanelProps {
    showWhenUsingJava?: boolean;
}

export default function ControllerPanel({ showWhenUsingJava }: ControllerPanelProps) {
    return (
        <div>
            <label>
                <input
                    type="checkbox"
                    defaultChecked={showWhenUsingJava}
                    onChange={toggleVisibility}
                />
                {" "}Show Help Center when using Java
            </label>
        </div>
    );
}

function toggleVisibility(event: React.ChangeEvent<HTMLInputElement>) {
    setWelcomeVisibility(event.target.checked);
}
