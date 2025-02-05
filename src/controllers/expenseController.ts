import { Request, Response } from "express";
import pool from "../config/database";

export const createExpense = async (req: Request, res: Response) => {
  const client = await pool.connect();
    console.log(req.body);
  try {
    await client.query("BEGIN");
    const { datetime, orderid, quantity, name, price, totalprice } = req.body;

    // Create the expense first
    const insertExpenseQuery = `
      INSERT INTO expenses (datetime, orderid, quantity, name, price, totalprice)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    const expenseResult = await client.query(insertExpenseQuery, [datetime, orderid, quantity, name, price, totalprice]);
    const expenseId = expenseResult.rows[0].id;

    await client.query("COMMIT");

    res.json({
      id: expenseId,
      datetime,
      orderid,
      quantity,
      name,
      price,
      totalprice,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: (e as Error).message });
  } finally {
    client.release();
  }
};

export const getExpenseById = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const { id } = req.params;

  try {
    const getExpenseQuery = "SELECT * FROM expenses WHERE id = $1";
    const expenseResult = await client.query(getExpenseQuery, [id]);

    if (expenseResult.rows.length === 0) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    res.json(expenseResult.rows[0]);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  } finally {
    client.release();
  }
};

export const getAllExpenses = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const getExpensesQuery = "SELECT * FROM expenses";
    const expensesResult = await client.query(getExpensesQuery);

    res.json(expensesResult.rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  } finally {
    client.release();
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const { id } = req.params;
  const { datetime, orderid, quantity, name, price, totalprice } = req.body;

  try {
    await client.query("BEGIN");

    const updateExpenseQuery = `
      UPDATE expenses
      SET datetime = $1, orderid = $2, quantity = $3, name = $4, price = $5, totalprice = $6
      WHERE id = $7
      RETURNING *;
    `;
    const expenseResult = await client.query(updateExpenseQuery, [datetime, orderid, quantity, name, price, totalprice, id]);

    if (expenseResult.rows.length === 0) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    await client.query("COMMIT");

    res.json(expenseResult.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: (e as Error).message });
  } finally {
    client.release();
  }
}

export const deleteExpense = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const { id } = req.params;

  try {
    await client.query("BEGIN");

    const deleteExpenseQuery = "DELETE FROM expenses WHERE id = $1 RETURNING *";
    const expenseResult = await client.query(deleteExpenseQuery, [id]);

    if (expenseResult.rows.length === 0) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    await client.query("COMMIT");

    res.json({ message: "Expense deleted successfully" });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: (e as Error).message });
  } finally {
    client.release();
  }
}