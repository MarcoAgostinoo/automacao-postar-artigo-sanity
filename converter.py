import fitz  # PyMuPDF
import sys
import os

def converter(caminho_pdf):
    # Define pasta de saída
    pasta_saida = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')
    
    if not os.path.exists(pasta_saida):
        os.makedirs(pasta_saida)
    
    # Limpa imagens antigas
    for arquivo in os.listdir(pasta_saida):
        caminho_arquivo = os.path.join(pasta_saida, arquivo)
        if os.path.isfile(caminho_arquivo):
            os.unlink(caminho_arquivo)

    print(f"🐍 PYTHON: Abrindo '{caminho_pdf}'...")
    
    doc = fitz.open(caminho_pdf)
    zoom = 2.0 # Alta qualidade
    matriz = fitz.Matrix(zoom, zoom)

    count = 0
    for i, page in enumerate(doc):
        pix = page.get_pixmap(matrix=matriz)
        # Salva como 1.png, 2.png, etc.
        nome_arquivo = f"{i+1}.png"
        caminho_completo = os.path.join(pasta_saida, nome_arquivo)
        pix.save(caminho_completo)
        print(f"   ✅ Pág {i+1} salva: public/{nome_arquivo}")
        count += 1

    print(f"🐍 PYTHON: Sucesso! {count} páginas convertidas.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        converter(sys.argv[1])
    else:
        print("Erro: Nenhum PDF informado para o Python.")