// lib/spintax.ts

export function processSpintax(text: string): string {
  // Busca patrones como {hola|buen dia|que tal}
  const regex = /\{([^{}]+)\}/g;
  
  return text.replace(regex, (match, content) => {
    // Separa las opciones por la barra vertical |
    const options = content.split('|');
    // Elige una al azar
    const randomOption = options[Math.floor(Math.random() * options.length)];
    return randomOption;
  });
}
