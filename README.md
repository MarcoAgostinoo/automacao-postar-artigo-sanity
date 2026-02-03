# Automação de Conteúdo Híbrida: PDF para Sanity com Markdown

Este projeto é uma ferramenta de automação de fluxo de trabalho de conteúdo que extrai páginas de um documento PDF como imagens, as processa e as utiliza em um artigo escrito em Markdown que é então publicado em um headless CMS (Sanity). A solução utiliza uma abordagem híbrida, combinando Node.js para orquestração e processamento de dados, e Python para a conversão do PDF.

## Visão Geral

O objetivo principal é agilizar a criação de posts de blog que referenciam conteúdo visual de um arquivo PDF. Em vez de extrair, cortar e fazer o upload de cada imagem manualmente, este script automatiza todo o processo.

O fluxo de trabalho é o seguinte:

1.  **Conversão do PDF**: Um script Python é invocado para converter cada página de um arquivo PDF especificado em imagens PNG de alta resolução.
2.  **Leitura do Artigo em Markdown**: O script Node.js lê um arquivo `post.md`. Este arquivo usa "frontmatter" para metadados (título, slug, resumo) e Markdown para o corpo do conteúdo.
3.  **Processamento de Imagem**: O script Node.js pega as imagens PNG geradas, aplica um corte pré-configurado, as converte para o formato **WebP** (otimizado para a web) e faz o upload para o Sanity.
4.  **Montagem do Conteúdo**: O conteúdo Markdown é convertido para HTML.
5.  **Publicação**: O script analisa o HTML gerado, substitui as referências de imagem locais pelas URLs das imagens do Sanity e cria um novo post no CMS com todo o conteúdo.

## Como Funciona

O processo é orquestrado pelo script principal `automacao_master.js` e pode ser dividido nas seguintes etapas:

1.  **Detecção de PDF**: O script procura por um arquivo `.pdf` na pasta raiz do projeto.
2.  **Execução do Script Python**: O Node.js chama o script `converter.py`, passando o caminho do PDF encontrado. O script Python, utilizando a biblioteca `PyMuPDF`, converte cada página em um arquivo `.png` e o salva na pasta `public`.
3.  **Leitura e Parse do Markdown**: O conteúdo do post é lido do arquivo `post.md`. A biblioteca `gray-matter` é usada para separar os metadados (frontmatter) do corpo do artigo (Markdown). A biblioteca `marked` converte o conteúdo Markdown para HTML.
4.  **Processamento e Upload de Imagens**:
    *   O script analisa o HTML para encontrar todas as tags `<img>`.
    *   Para cada imagem, ele a lê da pasta `public`, realiza um corte (removendo margens, conforme configurado em `CROP_CONFIG`).
    *   A imagem cortada é então convertida para o formato **WebP** com qualidade de 80% usando a biblioteca `sharp`.
    *   A imagem WebP resultante é enviada para o Sanity usando a biblioteca `@sanity/client`. O nome do arquivo é atualizado para `.webp`.
5.  **Transformação do HTML**: O HTML do artigo é processado para converter a sintaxe padrão em "blocks" do Sanity. Durante esse processo, as tags `<img>` são convertidas em blocos de imagem do Sanity, referenciando os assets recém-carregados.
6.  **Criação do Post**: Um novo documento do tipo `post` é montado com todos os dados (título, slug, corpo do texto com as imagens, autor, categorias, etc.).
7.  **Envio para o Sanity**: O documento final é enviado para a API do Sanity, criando o post no CMS.

## Pré-requisitos

-   Node.js e npm
-   Python 3
-   Uma conta no [Sanity.io](https://sanity.io)

## Instalação

1.  Clone este repositório.
2.  Instale as dependências do Node.js:
    ```bash
    npm install
    ```
3.  Crie e ative um ambiente virtual para o Python:
    ```bash
    python -m venv .venv
    source .venv/bin/activate # No Linux/macOS
    # ou
    .venv\Scripts\activate # No Windows
    ```
4.  Instale as dependências do Python:
    ```bash
    pip install pymupdf
    ```
As dependências de Node.js `gray-matter` e `marked` serão instaladas com `npm install`.

## Configuração

1.  **Arquivo de Ambiente (`.env`)**:
    Crie um arquivo `.env` na raiz do projeto com as suas credenciais do Sanity:
    ```
    projectId="SEU_PROJECT_ID"
    dataset="SEU_DATASET"
    SANITY_TOKEN="SEU_TOKEN_DE_API"
    ```
2.  **Conteúdo do Artigo (`post.md`)**:
    Edite o arquivo `post.md` para definir o conteúdo do seu post. Use o formato frontmatter para os metadados e Markdown para o texto. O HTML deve referenciar as imagens pelo seu número de página (ex: `1.png`, `2.png`).
3.  **Configuração de Corte (`automacao_master.js`)**:
    Ajuste o objeto `CROP_CONFIG` dentro de `automacao_master.js` para definir as margens a serem removidas das imagens.

## Uso

1.  Coloque o arquivo PDF que você deseja usar na pasta raiz do projeto.
2.  Edite o arquivo `post.md` com o conteúdo do seu artigo.
3.  Certifique-se de que o seu ambiente virtual Python está ativado.
4.  Execute o script principal:
    ```bash
    node automacao_master.js
    ```
O script irá executar todo o processo e, se for bem-sucedido, um novo post aparecerá no seu projeto Sanity.