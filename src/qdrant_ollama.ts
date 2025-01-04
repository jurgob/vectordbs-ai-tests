import { QdrantClient } from '@qdrant/js-client-rest';
import { Ollama } from 'ollama';
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
const MODEL_NAME = "mistral:latest";
const COLLECTION_NAME = "test_collection";

// Initialize Ollama client
const ollama = new Ollama();

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: 'http://localhost:6333', // Qdrant instance URL
});

// Function to generate embeddings using Ollama
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await ollama.embed({
    model: MODEL_NAME,
    input:text
  });
  return response.embeddings[0] ?? [];
}

export async function test() {
  const question = "How old is Jurgo?";
  console.log(`starting test`);
  // Step 1: Create or get the collection
  try {
    await qdrant.deleteCollection(COLLECTION_NAME)

    await qdrant.getCollection(COLLECTION_NAME).catch(async () => {
        return await qdrant.createCollection(COLLECTION_NAME,{
            vectors: {
              size: 4096, // Match the vector size of Mistral embeddings
              distance: 'Dot',
            },
          });
    });
    
  } catch (error) {
    if ((error as any).response?.status !== 409) {
      console.error('Error creating collection:', error);
      return;
    }
    console.log('Collection already exists.');
  }
  console.log(`collecton created`);
  // Step 2: Add documents to the collection
  const documents = [
    "My name is Jurgo. I'm 42 years old and I like to play basketball",
    "My name is Madeline. I'm 41 years old and I like to play football",
  ];

  const ids = [1, 2];

  const points = await Promise.all(
    documents.map(async (doc, index) => ({
      id: ids[index] as number,
      vector: await generateEmbedding(doc),
      payload: { text: doc },
    }))
  );
  console.log(`embeddings created`);
  await qdrant.upsert(COLLECTION_NAME, {
    points,
    wait: true,
  });
  console.log('Documents added to Qdrant.');

  // Step 3: Query the collection
  const queryEmbedding = await generateEmbedding(question);
  console.log(`starting searcg`)

  const searchResults = await qdrant.search(COLLECTION_NAME,{
    vector: queryEmbedding,
    limit: 1,
  });

  const relevantDocuments = searchResults.map((result) => result.payload?.text as string);
  console.log('Relevant documents:', relevantDocuments);
  // Step 4: Use Ollama to generate a response based on the relevant document
  const response = await ollama.chat({
    model: MODEL_NAME,
    messages: [
      { role: 'assistant', content: `Answer the next question using this information: ${relevantDocuments[0]}` },
      { role: 'user', content: question },
    ],
  });

  return response;
}
