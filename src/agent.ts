// src/agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import * as fs from 'fs';
import * as path from 'path';

interface AgentConfig {
  model: string;
  temperature: number;
  knowledgeBasePath: string;
}

export class OfficialDocAgent {
  private llm: ChatOpenAI;
  private systemPrompt: string;
  private policyBank: string;

  constructor(config: AgentConfig) {
    // 从环境变量获取 Key 和 BaseURL
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseURL = process.env.DEEPSEEK_BASE_URL;
    const modelName = process.env.DEEPSEEK_MODEL || config.model;

    if (!apiKey) {
      throw new Error("未找到 DEEPSEEK_API_KEY 环境变量，请检查 .env 文件");
    }

    this.llm = new ChatOpenAI({
      modelName: modelName,
      temperature: config.temperature,
      openAIApiKey: apiKey,
      configuration: {
        baseURL: baseURL,
      },
    });

    this.systemPrompt = this.loadSystemPrompt();
    this.policyBank = this.loadPolicyBank(config.knowledgeBasePath);
  }

  // ... (其余方法保持不变)
  
  private loadSystemPrompt(): string {
    const promptPath = path.join(__dirname, '../prompts/system.md');
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, 'utf-8');
    }
    return "你是一名专业的公文写作助手，严格遵循《党政机关公文格式》国家标准。";
  }

  private loadPolicyBank(basePath: string): string {
    const policyPath = path.join(basePath, 'gov_docs/policy_bank.md');
    if (fs.existsSync(policyPath)) {
      return fs.readFileSync(policyPath, 'utf-8');
    }
    return "";
  }

  async generateDocument(userRequest: string, docType: string): Promise<string> {
    const fullSystemPrompt = `
      ${this.systemPrompt}
      
      【参考政策与表述库】
      ${this.policyBank}
      
      【当前任务】
      请撰写一篇【${docType}】。
      要求：
      1. 严格使用参考库中的规范表述。
      2. 结构符合 GB/T 9704-2012 标准。
      3. 语气庄重、逻辑严密。
    `;

    const response = await this.llm.invoke([
      new SystemMessage(fullSystemPrompt),
      new HumanMessage(userRequest)
    ]);

    return response.content as string;
  }
}

