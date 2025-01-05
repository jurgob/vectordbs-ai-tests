import { test as chroma_test } from './chromadb_ollama';
import { test as qdrant_test } from './qdrant_ollama';
import { test as qdrant_openai_test } from './qdrant_openai';
console.log(`starting...`);
async function main(){
    console.log(`running...`);
    const results = await qdrant_openai_test()
    console.log(`results:`);
    console.log(results)
}

main();
