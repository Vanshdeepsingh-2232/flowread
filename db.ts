import Dexie, { Table } from 'dexie';
import { Book, Chunk, BrainBankItem } from './types';

class FlowReadDatabase extends Dexie {
  books!: Table<Book>;
  chunks!: Table<Chunk>;
  brainBank!: Table<BrainBankItem>;

  constructor() {
    super('FlowReadDB');
    (this as any).version(1).stores({
      books: 'id, title, dateAdded',
      chunks: 'id, bookId, index, [bookId+index]', // Compound index for efficient querying
      brainBank: 'id, savedAt, bookId'
    });
  }
}

export const db = new FlowReadDatabase();