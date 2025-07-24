import { AzureOpenAI } from "openai";

const endpoint   = process.env.AZURE_OPENAI_ENDPOINT!;
const apiKey     = process.env.AZURE_OPENAI_KEY!;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT!;     // also serves as model name
const apiVersion = process.env.AZURE_OPENAI_API_VERSION!;

export const client = new AzureOpenAI({ endpoint, apiKey, deployment, apiVersion });
export const modelName = deployment;
