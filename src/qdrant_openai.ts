import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import { sleep } from 'openai/core.mjs';

// Configuration for OpenAI
const OPENAI_API_KEY = 'your-openai-api-key';
const MODEL_NAME = 'text-embedding-ada-002'; // OpenAI embedding model
const CHAT_MODEL = 'gpt-3.5-turbo'; // OpenAI chat model
const COLLECTION_NAME = 'test_collection_openai';

// const configuration = new Configuration({
//   apiKey: OPENAI_API_KEY,
// });
const openai = new OpenAI();

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: 'http://localhost:6333', // Qdrant instance URL
});

// Function to generate embeddings using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  console.log(`Generating embedding for: ${text}`);
  const response = await openai.embeddings.create({
    model: MODEL_NAME,
    input: text,
  });
  const embedding = response.data[0]?.embedding as number[];
  console.log(`Embedding generated: `, embedding);
  return embedding;
}

async function createCollection() {
  try {
    await qdrant.deleteCollection(COLLECTION_NAME);
    await qdrant.getCollection(COLLECTION_NAME).catch(async () => {
      return await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 1536, // Match the vector size of `text-embedding-ada-002`
          distance: 'Cosine', // Use Cosine distance for similarity search
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
}

async function upsertDocuments() {
  const documents = [
    "My name is Jurgo. I'm 42 years old and I like to play basketball",
    "My name is Madeline. I'm 41 years old and I like to play football",
  ];

  const ids = [1, 2];

  const points = await Promise.all(
    documents.map(async (doc, index) => {
      const id = ids[index] as number;
      await sleep(5000 * index);
      const vector = await generateEmbedding(doc);
      console.log(`Embedding created ${id} - ${vector}`);
      return {
        id,
        vector,
        payload: { text: doc },
      };
    })
  );
  console.log(`Embeddings created`);
  await qdrant.upsert(COLLECTION_NAME, {
    points,
    wait: true,
  });
}

export async function test() {
  const question = "How old is Jurgo?";
  console.log(`Starting test`, process.env.OPENAI_API_KEY);
  await createCollection();
  console.log(`dio cane Collection created`);
  await upsertDocuments();
  console.log('Documents added to Qdrant.');

  // Step 3: Query the collection
  const queryEmbedding = await generateEmbedding(question);
  console.log(`Starting search`);

  const searchResults = await qdrant.search(COLLECTION_NAME, {
    vector: queryEmbedding,
    limit: 1,
    params: {
      exact: true,
    },
  });

  console.log('Search results:', searchResults);
  const relevantDocuments = searchResults.map((result) => result.payload?.text as string);
// const relevantDocuments = ["My name is Jurgo. I'm 42 years old and I like to play basketball"]
  console.log('Relevant documents:', relevantDocuments);

  // Step 4: Use OpenAI Chat to generate a response
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: `Answer the next question using this information: ${relevantDocuments[0]}` },
      { role: 'user', content: question },
    ],
  });

  const content = response
  console.log('Response:',content);
  return content;
}
 