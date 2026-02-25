export async function confirmPrompt(question: string): Promise<boolean> {
  process.stdout.write(`${question} [y/N] `);

  const stdin = process.stdin;
  stdin.resume();
  stdin.setEncoding('utf8');

  return new Promise<boolean>((resolve) => {
    const onData = (chunk: string): void => {
      stdin.pause();
      stdin.off('data', onData);
      const text = chunk.trim().toLowerCase();
      resolve(text === 'y' || text === 'yes');
    };

    stdin.on('data', onData);
  });
}
