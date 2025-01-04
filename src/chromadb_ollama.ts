import { ChromaClient,OllamaEmbeddingFunction } from "chromadb";
import ollama from 'ollama'
const MODEL_NAME = "mistral:latest"

const embeddingFunction: OllamaEmbeddingFunction = new OllamaEmbeddingFunction({
    model: MODEL_NAME,
    url: "http://localhost:11434/api/embeddings",
})

export async function test(){
    const client = new ChromaClient();
    const question = "How old is Jurgo?"

    const collection = await client.getOrCreateCollection({
        name: "test_collection",
        embeddingFunction
    });
    await collection.add({
        documents: [
            "My name is jurgo. I'm 42 years old and I like to play basketball",
            "My name is Madeline. I'm 41 years old and I like to play football",
        ],
        ids: ["id1", "id2"],
    });
    
    console.log(`starting query`)
    const results = await collection.query({
        queryTexts: question, // Chroma will embed this for you
        nResults: 2, // how many results to return
    });

    const relevantDocuments = results.documents[0] as string[]

    const response = await ollama.chat({
        model: MODEL_NAME,
        messages: [
            {role: 'assistant', content: `Answer the next question using this information: ${relevantDocuments[0]}`},
            { role: 'user', content: question }
        ],
      })
    

    return response
}