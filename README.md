# Automação de Conteúdo Híbrida: PDF para Sanity

Este projeto é uma ferramenta de automação de fluxo de trabalho de conteúdo que extrai páginas de um documento PDF como imagens, as processa e as utiliza em um artigo que é então publicado em um headless CMS (Sanity). A solução utiliza uma abordagem híbrida, combinando Node.js para orquestração e processamento de dados, e Python para a conversão do PDF.

## Visão Geral

O objetivo principal é agilizar a criação de posts de blog que referenciam conteúdo visual de um arquivo PDF. Em vez de extrair, cortar e fazer o upload de cada imagem manualmente, este script automatiza todo o processo.

O fluxo de trabalho é o seguinte:

1.  **Conversão do PDF**: Um script Python é invocado para converter cada página de um arquivo PDF especificado em imagens PNG de alta resolução.
2.  **Processamento de Imagem**: Um script Node.js pega as imagens geradas, aplica um corte pré-configurado e faz o upload para o Sanity.
3.  **Montagem do Conteúdo**: O script Node.js lê um arquivo de artigo pré-definido (`artigo.js`) que contém o texto e a estrutura do post em HTML.
4.  **Publicação**: O script substitui as referências de imagem locais no HTML pelas URLs das imagens do Sanity e cria um novo post no CMS com todo o conteúdo.

## Como Funciona

O processo é orquestrado pelo script principal `automacao_master.js` e pode ser dividido nas seguintes etapas:

1.  **Detecção de PDF**: O script procura por um arquivo `.pdf` na pasta raiz do projeto.
2.  **Execução do Script Python**: O Node.js chama o script `converter.py`, passando o caminho do PDF encontrado. O script Python, utilizando a biblioteca `PyMuPDF`, converte cada página em um arquivo `.png` e o salva na pasta `public`.
3.  **Leitura do Artigo**: O conteúdo do post (título, slug, HTML, etc.) é importado do arquivo `artigo.js`.
4.  **Processamento e Upload de Imagens**:
    *   O script analisa o HTML do artigo para encontrar todas as tags `<img>`.
    *   Para cada imagem, ele a lê da pasta `public`, realiza um corte (removendo margens, conforme configurado em `CROP_CONFIG`) e faz o upload para o Sanity usando a biblioteca `@sanity/client`.
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

## Configuração

1.  **Arquivo de Ambiente (`.env`)**:
    Crie um arquivo `.env` na raiz do projeto com as suas credenciais do Sanity:
    ```
    projectId="SEU_PROJECT_ID"
    dataset="SEU_DATASET"
    SANITY_TOKEN="SEU_TOKEN_DE_API"
    ```
2.  **Conteúdo do Artigo (`artigo.js`)**:
    Edite o arquivo `artigo.js` para definir o conteúdo do seu post. O HTML deve referenciar as imagens pelo seu número de página (ex: `1.png`, `2.png`).
3.  **Configuração de Corte (`automacao_master.js`)**:
    Ajuste o objeto `CROP_CONFIG` dentro de `automacao_master.js` para definir as margens a serem removidas das imagens.

## Uso

1.  Coloque o arquivo PDF que você deseja usar na pasta raiz do projeto.
2.  Certifique-se de que o seu ambiente virtual Python está ativado.
3.  Execute o script principal:
    ```bash
    node automacao_master.js
    ```
O script irá executar todo o processo e, se for bem-sucedido, um novo post aparecerá no seu projeto Sanity.
