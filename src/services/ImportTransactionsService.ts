import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const readStream = fs.createReadStream(filePath);
      
    const parsers = csvParse({
      from_line: 2,
    });

    const parseCSV = readStream.pipe(parsers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value) return;
      categories.push(category);
      transactions.push({title,type,value,category});
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existCateg = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existCategTitles = existCateg.map(
      (category: Category) => category.title,
    );

    const addCatTitles = categories
      .filter(category => !existCategTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategory = categoriesRepository.create(
      addCatTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategory);

    const finalCategories = [...newCategory, ...existCateg];

    const createdTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;