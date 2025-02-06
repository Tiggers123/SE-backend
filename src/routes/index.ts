import express, { Request, Response } from "express";
import {
  getAllStock,
  addStock,
  updateStock,
  getStockByDrugId,
} from "../controllers/StockController";

import {
  getAllDrugs,
  addDrug,
  getDrugById,
  updateDrug,
  deleteDrug,
} from "../controllers/DrugController";

import { createBill, getBillById,removeBill,updateBill,history,dashboard } from "../controllers/BillController";

import { getAllExpenses,createExpense,deleteExpense,updateExpense,getExpenseById } from "../controllers/expenseController";

import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

router.get("/stocks", getAllStock);
router.post("/stocks", addStock);
router.put("/stocks/:id", updateStock);
router.get("/stocks/drug/:drug_id", getStockByDrugId);

router.get("/drugs", getAllDrugs);
router.get("/drugs/:id", getDrugById);
router.post("/drugs", addDrug);
router.put("/drugs/:id", updateDrug);
router.delete("/drugs/:id", deleteDrug);

// Bill routes
router.post("/bill/create", createBill);
router.get("/bill/:bill_id", getBillById);
router.delete("/bill/remove/:id", removeBill);
router.put("/bill/update/:id", updateBill);
router.get("/bill/history", history);
router.get("/bill/dashboard/:year", dashboard);

router.get("/expense", getAllExpenses);
router.post("/expense/create", createExpense);
router.delete("/expense/remove/:id", deleteExpense);
router.put("/expense/update/:id", updateExpense);
router.get("/expense/:id", getExpenseById);



router.get("/", (req: Request, res: Response) => {
  res.send("Hello World");
});

export default router;
