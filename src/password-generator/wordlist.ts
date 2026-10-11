/**
 * Lista de palavras para frases-senha.
 * Palavras curtas, comuns e sem acento (baseada em listas públicas tipo EFF).
 * A aleatoriedade vem de crypto.getRandomValues(), nunca de Math.random().
 */
export const WORDLIST: readonly string[] = [
  'abrir', 'acender', 'agua', 'aire', 'alma', 'amigo', 'amor', 'andar', 'anjo', 'azul',
  'bala', 'banana', 'barco', 'bairro', 'beijo', 'bem', 'branco', 'brisa', 'buraco', 'cafe',
  'caixa', 'cama', 'caminho', 'cantar', 'capaz', 'carro', 'casal', 'casca', 'ceu', 'chama',
  'chave', 'cidade', 'claro', 'coisa', 'copo', 'cor', 'corpo', 'costa', 'cravo', 'dedo',
  'dente', 'deserto', 'dia', 'dinheiro', 'doce', 'dom', 'duro', 'eco', 'escola', 'estrela',
  'fada', 'faca', 'falar', 'familia', 'faro', 'festa', 'flor', 'foguete', 'fonte', 'fruta',
  'fundo', 'galo', 'ganso', 'gente', 'girassol', 'guarda', 'harpa', 'ilha', 'jabuti', 'janela',
  'jardim', 'jesus', 'joia', 'jogo', 'laranja', 'lata', 'leite', 'letra', 'livro', 'luz',
  'madrugada', 'mao', 'mar', 'martelo', 'mel', 'mente', 'mesa', 'metal', 'metro', 'moinho',
  'morro', 'mundo', 'musica', 'navio', 'neve', 'noite', 'noiva', 'norte', 'nuvem', 'obra',
  'oceano', 'olho', 'onda', 'orcestro', 'ovelha', 'paciencia', 'papel', 'parque', 'pasta', 'pedra',
  'peixe', 'penna', 'piano', 'pimenta', 'planeta', 'poeira', 'ponte', 'praia', 'prego', 'primeiro',
  'principe', 'pular', 'puro', 'queijo', 'raio', 'rampa', 'rapido', 'rede', 'relogio', 'rio',
  'rocha', 'roda', 'saber', 'samba', 'segredo', 'selo', 'sino', 'sol', 'som', 'sopro',
  'talher', 'tambor', 'tarefa', 'tijolo', 'torrente', 'trigo', 'trovao', 'tunel', 'urso', 'uva',
  'vela', 'vento', 'verao', 'verde', 'vidro', 'vila', 'vinho', 'volta', 'xamine', 'zelador',
];
