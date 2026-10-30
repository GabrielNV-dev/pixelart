# Pixel Forge — Editor de sprites

Editor independente em HTML, CSS e JavaScript puro. Abra `index.html` em um navegador moderno.

## Recursos
- Grades de 8x8, 16x16, 24x24, 32x32 e resolução personalizada (4–64).
- Desenho por clique e arraste, lápis, borracha e conta-gotas.
- Paleta editável, desfazer/refazer e limpeza do canvas.
- Exportação para o formato de sprites já usado no projeto (`cores` + `padrao`) e para classes/variáveis SCSS.

## Integração com o projeto
1. No exportador, copie a matriz JavaScript para um arquivo como `js/itens/sprs/spr_novo_item.js`.
2. Copie o SCSS para `css/itens/<nome>/_cores-<nome>.scss`.
3. O objeto exportado segue o padrão `export const nome = { cores: {...}, padrao: [...] }`. Cada letra identifica uma classe de cor; `N` representa transparência (`nada`).
4. Importe o arquivo SCSS no `css/index.scss`, como os demais módulos de cores.

O SCSS exportado gera classes `.nome-a`, `.nome-b` etc. O código de renderização do jogo deve aplicar a classe indicada em `cores` a cada pixel da matriz, tratando `N: "nada"` como transparente.
