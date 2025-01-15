import { test as chroma_test } from './chromadb_ollama';
import { test as qdrant_test } from './qdrant_ollama';
import { test as qdrant_openai_test } from './qdrant_openai';
import { test as qdrant_huggingface } from './qdrant_huggingface';
import { test as qdrant_vercelai } from './qdrant_vercelai';
console.log(`starting...`);

const FN = {
    chromadb_ollama: chroma_test,
    qdrant_ollama: qdrant_test,
    qdrant_openai: qdrant_openai_test,
    qdrant_huggingface: qdrant_huggingface,
    qdrant_vercelai: qdrant_vercelai
} as const;

type FN = keyof typeof FN;
async function main(){
    const fn: FN = 'qdrant_ollama';
    console.log(`running...`);
    if(typeof FN[fn] !== 'function'){
        throw new Error(`Function ${fn} not found`);
    }

    const results = await FN[fn]()
    console.log(`results:`);
    console.log(results)
}

main();
