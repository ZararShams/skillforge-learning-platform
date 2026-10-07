import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
for(const [input,output] of [['server/api.ts','server/api.mjs'],['lib/catalogue.ts','server/catalogue.mjs']]) writeFileSync(output,ts.transpileModule(readFileSync(input,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
