import { QdrantClient } from '@qdrant/js-client-rest';
import { HfInference,  } from "@huggingface/inference";

// Configuration
const COLLECTION_NAME = 'test_collection_hf';
const MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2'; // all-MiniLM-L6-v2, jinaai/jina-embeddings-v2-base-code
const CHAT_MODEL = '01-ai/Yi-1.5-34B-Chat'; 
const VECTOR_SIZE = 384;

const TOKEN = process.env.HF_TOKEN;
const hf = new HfInference(TOKEN);

const qdrant = new QdrantClient({
  url: 'http://localhost:6333', // Qdrant instance URL
});

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await hf.featureExtraction({
    inputs: text,
    model: MODEL_NAME,
  })
  const embedding = response as number[];
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

  console.log('Search results:', searchResults);
  const relevantDocuments = searchResults.map((result) => result.payload?.text);
  console.log('Relevant documents:', relevantDocuments);
  const response =  await  hf.chatCompletion({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: `Answer the next question using this information: ${relevantDocuments[0]}` },
      { role: 'user', content: question },
    ],
  })

  const content = response?.choices[0]?.message?.content;
  return content;
}
 