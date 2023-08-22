export class SentenceManager {
  private sentences: string[];

  constructor() {
    this.sentences = [];

    this.sentences.push('Phrase 1');
    this.sentences.push('Phrase 2');
    this.sentences.push('Phrase 3');
    this.sentences.push('Phrase 4');
    this.sentences.push('Phrase 5');
    this.sentences.push('Phrase 6');
    this.sentences.push('Phrase 7');
    this.sentences.push('Phrase 8');
    this.sentences.push('Phrase 9');
  }

  getSentence() {
    const sentenceIndex = Math.floor(Math.random() * this.sentences.length);
    return this.sentences[sentenceIndex];
  }
}
