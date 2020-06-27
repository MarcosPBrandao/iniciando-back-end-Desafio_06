import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = this.find();
    const {income,outcome} = (await transactions).reduce((resultado,transaction) => {
      if (transaction.type == 'income') { resultado.income += Number(transaction.value) } 
      if (transaction.type == 'outcome') { resultado.outcome += Number(transaction.value) }
      return resultado;
    },{
      income: 0,
      outcome: 0,
      total: 0
    });
    const total = income - outcome; 
    return {income, outcome, total };   
  }
}
export default TransactionsRepository;
