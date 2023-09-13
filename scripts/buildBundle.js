// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const cp = require('child_process');
const fse = require('fs-extra');
const path = require('path');

const server_dir = path.resolve('jdtls.ext');

cp.execSync(mvnw()+ ' clean package', {cwd:server_dir, stdio:[0,1,2]} );
copy(path.join(server_dir, 'com.microsoft.jdtls.daemon.core/target'), path.resolve('server'), (file) => {
    return /^com.microsoft.jdtls.daemon.core.*.jar$/.test(file);
});

function copy(sourceFolder, targetFolder, fileFilter) {
    const jars = fse.readdirSync(sourceFolder).filter(file => fileFilter(file));
    fse.ensureDirSync(targetFolder);
    for (const jar of jars) {
        fse.copyFileSync(path.join(sourceFolder, jar), path.join(targetFolder, path.basename(jar)));
    }
}

function isWin() {
    return /^win/.test(process.platform);
}

function mvnw() {
    return isWin()?"mvnw.cmd":"./mvnw";
}