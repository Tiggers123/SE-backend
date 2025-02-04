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
router.post("/api/bill/create", createBill);
router.get("/api/bill/:bill_id", getBillById);
router.delete("/api/bill/remove/:id", removeBill);
router.put("/api/bill/update/:id", updateBill);
router.get("/api/bill/history", history);
router.get("/api/bill/dashboard/:year", dashboard);


router.get("/", (req: Request, res: Response) => {
  res.send("Hello World");
});

export default router;
