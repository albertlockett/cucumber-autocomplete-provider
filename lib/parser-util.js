'use babel';

export const parseInstructionFromLine = line => {
  const verb = parseVerbFromLine(line);
  let tokens =  line.trim().split(verb);
  return tokens.splice(1, tokens.length).join(verb).trim();
};


export const parseVerbFromLine = line => {
  let verb = line.trim().split(' ')[0];
  return verb;
};
