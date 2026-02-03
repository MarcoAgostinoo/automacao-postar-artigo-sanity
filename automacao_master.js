require('dotenv').config();
const { createClient } = require('@sanity/client');
const { htmlToBlocks } = require('@sanity/block-tools');
const { JSDOM } = require('jsdom');
const { Schema } = require('@sanity/schema');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process'); // Ferramenta para chamar o Python

// 1. IMPORTAÇÃO DO ARTIGO
const artigo = require('./artigo'); 

// 2. CAÇADOR DE PDF
const arquivosDaPasta = fs.readdirSync(__dirname);
const nomeArquivoPDF = arquivosDaPasta.find(arquivo => arquivo.toLowerCase().endsWith('.pdf'));

if (!nomeArquivoPDF) {
  console.error("❌ ERRO: Nenhum arquivo PDF encontrado na pasta raiz!");
  process.exit(1);
}

// Resolve o caminho absoluto para evitar erros de espaço no Windows
const caminhoAbsolutoPDF = path.join(__dirname, nomeArquivoPDF);

console.log(`=============================================`);
console.log(`🤖 AUTOMAÇÃO HÍBRIDA (NODE + PYTHON)`);
console.log(`📄 PDF: ${nomeArquivoPDF}`);
console.log(`📝 Artigo: "${artigo.titulo}"`);
console.log(`=============================================`);

// --- CONFIGURAÇÃO DE CORTE ---
const DPI = 96;
const PX_PER_CM = Math.round(DPI / 2.54);
const CROP_CONFIG = {
  bottom: Math.round(1 * PX_PER_CM),
  left: Math.round(1 * PX_PER_CM),
  right: Math.round(1 * PX_PER_CM),
  top: 0
};

const client = createClient({
  projectId: process.env.projectId,
  dataset: process.env.dataset,
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN,
});

const defaultSchema = Schema.compile({
  name: 'myBlog',
  types: [{
      type: 'object',
      name: 'post',
      fields: [{ name: 'body', type: 'array', of: [{ type: 'block' }, { type: 'image' }] }]
    }]
});
const blockContentType = defaultSchema.get('post').fields.find((f) => f.name === 'body').type;

// =======================================================
// ETAPA 1: CHAMAR O PYTHON PARA CONVERTER
// =======================================================
function chamarPythonParaConverter() {
  console.log(`\n⚙️  Etapa 1: Chamando Python para converter PDF...`);
  try {
    // Comando mágico: Node manda o Python executar o script converter.py
    // As aspas em "${caminhoAbsolutoPDF}" protegem contra espaços no nome da pasta
    execSync(`python converter.py "${caminhoAbsolutoPDF}"`, { stdio: 'inherit' });
  } catch (error) {
    console.error("❌ Erro ao executar o script Python. Verifique se 'pip install pymupdf' foi feito.");
    process.exit(1);
  }
}

// =======================================================
// ETAPA 2: NODE ASSUME (Corte e Upload)
// =======================================================
async function processarImagem(nomeArquivoNoHtml) {
  try {
    const imagePath = path.join(__dirname, 'public', nomeArquivoNoHtml);
    
    if (!fs.existsSync(imagePath)) {
      console.warn(`   ⚠️  Imagem não encontrada: ${nomeArquivoNoHtml}`);
      return null;
    }

    const inputBuffer = fs.readFileSync(imagePath);
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    const newWidth = metadata.width - (CROP_CONFIG.left + CROP_CONFIG.right);
    const newHeight = metadata.height - (CROP_CONFIG.top + CROP_CONFIG.bottom);

    if (newWidth <= 0) return null;

    console.log(`   ✂️  Node processando: ${nomeArquivoNoHtml}`);

    const croppedBuffer = await image
      .extract({
        left: CROP_CONFIG.left,
        top: CROP_CONFIG.top,
        width: newWidth,
        height: newHeight
      })
      .toBuffer();

    const asset = await client.assets.upload('image', croppedBuffer, {
      filename: nomeArquivoNoHtml,
    });
    
    return asset._id;

  } catch (error) {
    console.error(`   ❌ Erro processamento ${nomeArquivoNoHtml}:`, error.message);
    return null;
  }
}

// =======================================================
// ETAPA 3: EXECUÇÃO
// =======================================================
async function executar() {
  try {
    // 1. Python converte
    chamarPythonParaConverter();

    console.log(`\n⚙️  Etapa 2: Analisando HTML e fazendo uploads...`);
    const dom = new JSDOM(artigo.conteudoHtml);
    const imagensNoHtml = Array.from(dom.window.document.querySelectorAll('img'));
    const mapaDeImagens = {};

    for (const img of imagensNoHtml) {
      const src = img.getAttribute('src');
      if (!mapaDeImagens[src]) {
        const assetId = await processarImagem(src);
        if (assetId) mapaDeImagens[src] = assetId;
      }
    }

    console.log(`\n⚙️  Etapa 3: Montando Post...`);
    const blocks = htmlToBlocks(artigo.conteudoHtml, blockContentType, {
      parseHtml: (html) => new JSDOM(html).window.document,
      rules: [
        {
          deserialize(el, next, block) {
            if (el.tagName?.toLowerCase() === 'img') {
              const src = el.getAttribute('src');
              const assetId = mapaDeImagens[src];
              if (!assetId) return undefined;

              return block({
                _type: 'image',
                asset: { _type: 'reference', _ref: assetId },
                alt: el.getAttribute('alt') || artigo.titulo,
              });
            }
            if (el.tagName?.toLowerCase() === 'pre') {
                return block({
                    _type: 'block',
                    style: 'normal', 
                    children: [{ _type: 'span', text: el.textContent }]
                })
            }
            return undefined;
          },
        },
      ],
    });

    const doc = {
      _type: 'post',
      title: artigo.titulo,
      slug: { _type: 'slug', current: artigo.slug },
      excerpt: artigo.resumo,
      seoTitle: artigo.seoTitle,
      seoDescription: artigo.seoDescription,
      author: { _type: 'reference', _ref: '7639c638-b868-478d-8f5d-e0767fda0248' }, 
      categories: [{ _type: 'reference', _ref: '43500a02-9e4a-4076-b0a4-773f1b639906', _key: 'ia-cat' }],
      publishedAt: new Date().toISOString(),
      body: blocks,
    };

    console.log(`\n📡  Etapa 4: Enviando para o Sanity...`);
    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Post criado: ${result.title}`);

  } catch (err) {
    console.error('\n❌ ERRO FATAL:', err.message);
  }
}

executar();