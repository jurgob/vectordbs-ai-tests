import { QdrantClient } from '@qdrant/js-client-rest';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Configuration
const COLLECTION_NAME = 'test_collection_vercelai';

const MODEL_NAME = 'text-embedding-ada-002';  // OpenAI embedding model
const CHAT_MODEL = 'gpt-3.5-turbo';  // OpenAI chat model
const VECTOR_SIZE = 1536;

const TOKEN = process.env.HF_TOKEN;

const qdrant = new QdrantClient({
  url: 'http://localhost:6333', // Qdrant instance URL
});

async function generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embedding(MODEL_NAME).doEmbed({
        values: [text],
    });
    const embedding = response.embeddings[0];
    if(!embedding) throw new Error('Embedding not found');
    return embedding;
  }

async function createCollection() {
  try {
    await qdrant.deleteCollection(COLLECTION_NAME);
    await qdrant.getCollection(COLLECTION_NAME).catch(async () => {
      return await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE, 
          distance: 'Cosine',
        },
      });
    });
  } catch (error) {
    if ((error as any).response?.status !== 409) {
      console.error('Error creating collection:', error);
      return;
    }
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
      const vector = await generateEmbedding(doc);
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
  console.log(`Starting test`);
  await createCollection();
  console.log(`Collection created`);
  await upsertDocuments();
  console.log('Documents added to Qdrant.');

  // Step 3: Query the collection
  const queryEmbedding = await generateEmbedding(question);
  console.log(`Starting search`);

  const searchResults = await qdrant.search(COLLECTION_NAME, {
    vector: queryEmbedding,
    limit: 1,
  });

  const relevantDocuments = searchResults.map((result) => result.payload?.text);
  const { text } = await generateText({
    model: openai(CHAT_MODEL),
    system: `Answer the next question using this information: ${relevantDocuments[0]}`,
    prompt: question,
  });

  

  const content = text;
  return content;
}
 