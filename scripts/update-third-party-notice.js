const fs = require('fs');
const path = require('path');
const formatRepositoryUrl = (url) => {
    if (!url) return url;
    url = url.replace(/\/$/, "");
    url = url.replace(/\.git$/, "");
    url = url.replace(/^git\+/, "");
    url = url.replace(/^git:github\.com:/, "https://github.com/");
    url = url.replace(/^git:\/\//, "https://");
    url = url.replace(/^ssh:\/\/git@/, "https://");
    return url;
}

const packageJSON = require(path.join(__dirname, "..", "package.json"));

const header = `THIRD-PARTY SOFTWARE NOTICES AND INFORMATION
For ${packageJSON.name} package

This extension uses Open Source components. You can find the source code of their
open source projects along with the license information below. We acknowledge and
are grateful to these developers for their contribution to open source.

`;

const entries = Object.keys(packageJSON.dependencies).map((name, idx) => {
    console.log("===>>>");
    console.log(name);
    // url
    const manifestFile = require(path.join(__dirname, "..", "node_modules", name, "package.json"));
    let url = manifestFile.repository?.url ?? manifestFile.repository;
    console.log(url, "\t", formatRepositoryUrl(url));
    url = formatRepositoryUrl(url);

    // license
    const packageRoot = path.join(__dirname, "..", "node_modules", name);
    const files = fs.readdirSync(packageRoot);
    const licenseFile = files.find(f => f.match(/^license/i));
    const license = licenseFile ? fs.readFileSync(path.join(packageRoot, licenseFile)) : undefined;
    console.log("<<<===");
    return {
        name,
        url,
        license
    }
    
});

const depsWithLicense = entries.filter(e => e.name !== undefined && e.license !== undefined);

const toc = depsWithLicense.map((dep, idx) => {
    return `${idx + 1}. ${dep.name} (${dep.url})`;
}).join("\n") + "\n";

const licenses = depsWithLicense.map(dep => {
    return `${dep.name} NOTICES BEGIN HERE
=============================
${dep.license}
=========================================
END OF ${dep.name} NOTICES AND INFORMATION
`;
}).join("\n");

const content = [header, toc, licenses].join("\n");
fs.writeFileSync(path.join(__dirname, "..", "ThirdPartyNotices.txt"), content);
