import { Request, Response } from "express";
import pool from "../config/database";

// export const createBill = async (req: Request, res: Response) => {
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");
//     const { customer_name, items } = req.body;

//     let totalAmount = 0;

//     // Create the bill first
//     const insertBillQuery = `
//       INSERT INTO bills (customer_name, total_amount)
//       VALUES ($1, $2)
//       RETURNING bill_id;
//     `;
//     const billResult = await client.query(insertBillQuery, [customer_name, 0]);
//     const billId = billResult.rows[0].bill_id;

//     // Add each item
//     for (const item of items) {
//       const { stock_id, quantity } = item;

//       // Get stock details
//       const stockQuery = "SELECT unit_price FROM stocks WHERE stock_id = $1";
//       const stockResult = await client.query(stockQuery, [stock_id]);

//       if (stockResult.rows.length === 0) {
//         throw new Error(`Stock with id ${stock_id} not found`);
//       }

//       const unitPrice = stockResult.rows[0].unit_price;
//       const subtotal = unitPrice * quantity;
//       totalAmount += subtotal;

//       // Insert bill item without unit_price
//       await client.query(
//         `INSERT INTO bill_items (bill_id, stock_id, quantity, subtotal)
//          VALUES ($1, $2, $3, $4)`,
//         [billId, stock_id, quantity, subtotal]
//       );
//     }

//     // Update bill total
//     await client.query(
//       "UPDATE bills SET total_amount = $1 WHERE bill_id = $2",
//       [totalAmount, billId]
//     );

//     await client.query("COMMIT");

//     // Get complete bill
//     const completeBill = await client.query(
//       `SELECT
//         b.bill_id,
//         b.customer_name,
//         b.total_amount,
//         b.created_at,
//         bi.bill_item_id,
//         bi.stock_id,
//         bi.quantity,
//         bi.subtotal,
//         s.unit_price,
//         d.name as drug_name
//        FROM bills b
//        JOIN bill_items bi ON b.bill_id = bi.bill_id
//        JOIN stocks s ON bi.stock_id = s.stock_id
//        JOIN drugs d ON s.drug_id = d.drug_id
//        WHERE b.bill_id = $1`,
//       [billId]
//     );

//     res.status(201).json({
//       message: "Bill created successfully",
//       bill: completeBill.rows,
//     });
//   } catch (error: any) {
//     await client.query("ROLLBACK");
//     res.status(500).json({
//       error: "Failed to create bill",
//       details: error.message,
//     });
//   } finally {
//     client.release();
//   }
// };

// export const createBill = async (req: Request, res: Response) => {
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");
//     const { items } = req.body;

//     // Find active bill (bill that has items with no bill_id)
//     const activeBillQuery = `
//       SELECT DISTINCT bi.bill_id
//       FROM bill_items bi
//       WHERE bi.bill_id IS NULL
//       LIMIT 1
//     `;
//     const activeBillResult = await client.query(activeBillQuery);

//     for (const item of items) {
//       const { stock_id, quantity } = item;

//       // Validate stock exists and get price
//       const stockQuery = `
//         SELECT unit_price, amount
//         FROM stocks
//         WHERE stock_id = $1
//       `;
//       const stockResult = await client.query(stockQuery, [stock_id]);

//       if (stockResult.rows.length === 0) {
//         throw new Error(`Stock with id ${stock_id} not found`);
//       }

//       const { unit_price, amount } = stockResult.rows[0];

//       // Check if enough stock
//       if (amount < quantity) {
//         throw new Error(
//           `Insufficient stock for id ${stock_id}. Available: ${amount}`
//         );
//       }

//       const subtotal = unit_price * quantity;

//       // Insert bill item without bill_id
//       await client.query(
//         `INSERT INTO bill_items (stock_id, quantity, subtotal)
//          VALUES ($1, $2, $3)`,
//         [stock_id, quantity, subtotal]
//       );

//       // Update stock amount
//       await client.query(
//         `UPDATE stocks
//          SET amount = amount - $1
//          WHERE stock_id = $2`,
//         [quantity, stock_id]
//       );
//     }

//     await client.query("COMMIT");

//     // Get all current bill items
//     const currentItems = await client.query(`
//       SELECT
//         bi.bill_item_id,
//         bi.stock_id,
//         bi.quantity,
//         bi.subtotal,
//         s.unit_price,
//         d.name as drug_name
//       FROM bill_items bi
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       WHERE bi.bill_id IS NULL
//       ORDER BY bi.bill_item_id ASC
//     `);

//     res.status(201).json({
//       message: "Bill items added successfully",
//       items: currentItems.rows,
//     });
//   } catch (error: any) {
//     await client.query("ROLLBACK");
//     res.status(500).json({
//       error: "Failed to add bill items",
//       details: error.message,
//     });
//   } finally {
//     client.release();
//   }
// };//ใช้อันนี้นะ

export const createBill = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const { items } = req.body;

    // Find active bill (bill that has items with no bill_id)
    const activeBillQuery = `
      SELECT DISTINCT bi.bill_id
      FROM bill_items bi
      WHERE bi.bill_id IS NULL
      LIMIT 1
    `;
    const activeBillResult = await client.query(activeBillQuery);

    for (const item of items) {
      const { stock_id, quantity } = item;

      // Validate stock exists and get price
      const stockQuery = `
        SELECT unit_price, amount 
        FROM stocks 
        WHERE stock_id = $1
      `;
      const stockResult = await client.query(stockQuery, [stock_id]);

      if (stockResult.rows.length === 0) {
        throw new Error(`Stock with id ${stock_id} not found`);
      }

      const { unit_price, amount } = stockResult.rows[0];

      // Check if enough stock
      if (amount < quantity) {
        throw new Error(
          `Insufficient stock for id ${stock_id}. Available: ${amount}`
        );
      }

      const subtotal = unit_price * quantity;

      // Insert bill item with status 'pending'
      await client.query(
        `INSERT INTO bill_items (stock_id, quantity, subtotal, status)
         VALUES ($1, $2, $3, 'pending')`,
        [stock_id, quantity, subtotal]
      );

      // Update stock amount
      await client.query(
        `UPDATE stocks 
         SET amount = amount - $1 
         WHERE stock_id = $2`,
        [quantity, stock_id]
      );
    }

    await client.query("COMMIT");

    // Get all current pending bill items
    const currentItems = await client.query(`
      SELECT 
        bi.bill_item_id,
        bi.stock_id,
        bi.quantity,
        bi.subtotal,
        s.unit_price,
        d.name as drug_name
      FROM bill_items bi
      JOIN stocks s ON bi.stock_id = s.stock_id
      JOIN drugs d ON s.drug_id = d.drug_id
      WHERE bi.status = 'pending'
      ORDER BY bi.bill_item_id ASC
    `);

    res.status(201).json({
      message: "Bill items added successfully",
      items: currentItems.rows,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    res.status(500).json({
      error: "Failed to add bill items",
      details: error.message,
    });
  } finally {
    client.release();
  }
}; //อันนี้ของจริงงงงงงงงงงง

// export const listBills = async (req: Request, res: Response): Promise<void> => {
//   const client = await pool.connect();

//   try {
//     const result = await client.query(`
//       SELECT
//         bi.bill_item_id,
//         bi.stock_id,
//         s.drug_id,
//         d.name AS drug_name,
//         bi.quantity,
//         bi.subtotal,
//         s.unit_price
//       FROM bill_items bi
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       ORDER BY bi.bill_item_id ASC
//     `);

//     res.status(200).json(result.rows); // ส่งกลับแค่ items
//   } catch (error: any) {
//     console.error("Error fetching bill items:", error);
//     res.status(500).json({
//       error: "Failed to fetch bill items",
//       message: error.message,
//     });
//   } finally {
//     client.release();
//   }
// };//ใช้อันนี้

export const listBills = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT 
        bi.bill_item_id,
        bi.stock_id,
        s.drug_id,
        d.name AS drug_name,
        bi.quantity,
        bi.subtotal,
        s.unit_price
      FROM bill_items bi
      JOIN stocks s ON bi.stock_id = s.stock_id
      JOIN drugs d ON s.drug_id = d.drug_id
      WHERE bi.status = 'pending'
      ORDER BY bi.bill_item_id ASC
    `);

    res.status(200).json(result.rows); // ส่งกลับแค่ items ที่ยังไม่ได้ยืนยัน
  } catch (error: any) {
    console.error("Error fetching bill items:", error);
    res.status(500).json({
      error: "Failed to fetch bill items",
      message: error.message,
    });
  } finally {
    client.release();
  }
};

export const removeBillItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  const client = await pool.connect();
  const billItemId = parseInt(req.params.id, 10);

  if (isNaN(billItemId)) {
    res.status(400).json({ error: "Invalid bill_item_id" });
    return;
  }

  try {
    await client.query("BEGIN");

    const billItemResult = await client.query(
      "SELECT stock_id, quantity FROM bill_items WHERE bill_item_id = $1",
      [billItemId]
    );

    if (billItemResult.rows.length === 0) {
      throw new Error(`Bill item with ID ${billItemId} not found`);
    }

    const { stock_id, quantity } = billItemResult.rows[0];

    await client.query("DELETE FROM bill_items WHERE bill_item_id = $1", [
      billItemId,
    ]);

    await client.query(
      "UPDATE stocks SET amount = amount + $1 WHERE stock_id = $2",
      [quantity, stock_id]
    );

    await client.query("COMMIT");

    res
      .status(200)
      .json({ message: `Bill item ${billItemId} removed and stock updated` });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error removing bill item:", error);
    res.status(500).json({
      error: "Failed to remove bill item",
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// export const confirm = async (req: Request, res: Response): Promise<void> => {
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");

//     // Check for existing bill items that need confirmation
//     const billItemsResult = await client.query(`
//       SELECT
//         bi.bill_item_id,
//         bi.stock_id,
//         bi.quantity,
//         bi.subtotal,
//         s.unit_price,
//         d.name AS drug_name
//       FROM bill_items bi
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       WHERE bi.bill_id IS NULL
//       ORDER BY bi.bill_item_id ASC
//     `);

//     if (billItemsResult.rows.length === 0) {
//       throw new Error("No bill items found to confirm");
//     }

//     const billItems = billItemsResult.rows;

//     // Calculate total amount from all unconfirmed items
//     const totalAmount = billItems.reduce(
//       (sum, item) => sum + parseFloat(item.subtotal),
//       0
//     );

//     // Create a new bill
//     const billResult = await client.query(
//       `INSERT INTO bills (total_amount, created_at)
//        VALUES ($1, NOW())
//        RETURNING bill_id`,
//       [totalAmount]
//     );
//     const newBillId = billResult.rows[0].bill_id;

//     // Update all unconfirmed bill items with the new bill_id
//     await client.query(
//       `UPDATE bill_items
//        SET bill_id = $1
//        WHERE bill_id IS NULL`,
//       [newBillId]
//     );

//     await client.query("COMMIT");

//     // Fetch the complete bill with all items, including newly associated ones
//     const completeBill = await client.query(
//       `SELECT
//         b.bill_id,
//         b.total_amount,
//         b.created_at,
//         json_agg(
//           json_build_object(
//             'bill_item_id', bi.bill_item_id,
//             'stock_id', bi.stock_id,
//             'quantity', bi.quantity,
//             'subtotal', bi.subtotal,
//             'unit_price', s.unit_price,
//             'drug_name', d.name
//           ) ORDER BY bi.bill_item_id ASC
//         ) AS items
//       FROM bills b
//       JOIN bill_items bi ON b.bill_id = bi.bill_id
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       WHERE b.bill_id = $1
//       GROUP BY b.bill_id, b.total_amount, b.created_at`,
//       [newBillId]
//     );

//     res.status(201).json({
//       message: "Bill confirmed successfully",
//       bill: completeBill.rows[0],
//     });
//   } catch (error: any) {
//     await client.query("ROLLBACK");
//     console.error("Error confirming bill:", error);
//     res.status(500).json({
//       error: "Failed to confirm bill",
//       message: error.message,
//     });
//   } finally {
//     client.release();
//   }
// };

// export const updateBill = async (req: Request, res: Response) => {
//   const client = await pool.connect();
//   const { id } = req.params;
//   const { customer_name, total_amount } = req.body;

//   try {
//     await client.query("BEGIN");

//     const updateBillQuery = `
//       UPDATE bills
//       SET customer_name = $1, total_amount = $2
//       WHERE bill_id = $3
//       RETURNING *;
//     `;
//     const billResult = await client.query(updateBillQuery, [
//       customer_name,
//       total_amount,
//       id,
//     ]);

//     if (billResult.rows.length === 0) {
//       res.status(404).json({ error: "Bill not found" });
//       return;
//     }

//     await client.query("COMMIT");
//     res.status(200).json(billResult.rows[0]);
//   } catch (error: any) {
//     await client.query("ROLLBACK");
//     res
//       .status(500)
//       .json({ error: "Failed to update bill", details: error.message });
//   } finally {
//     client.release();
//   }
// };

// export const confirm = async (req: Request, res: Response): Promise<void> => {
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");

//     // Check for existing bill items that need confirmation
//     const billItemsResult = await client.query(`
//       SELECT
//         bi.bill_item_id,
//         bi.stock_id,
//         bi.quantity,
//         bi.subtotal,
//         s.unit_price,
//         d.name AS drug_name
//       FROM bill_items bi
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       WHERE bi.bill_id IS NULL
//       ORDER BY bi.bill_item_id ASC
//     `);

//     if (billItemsResult.rows.length === 0) {
//       throw new Error("No bill items found to confirm");
//     }

//     const billItems = billItemsResult.rows;

//     // Calculate total amount from all unconfirmed items
//     const totalAmount = billItems.reduce(
//       (sum, item) => sum + parseFloat(item.subtotal),
//       0
//     );

//     // Create a new bill
//     const billResult = await client.query(
//       `INSERT INTO bills (total_amount, created_at)
//        VALUES ($1, NOW())
//        RETURNING bill_id`,
//       [totalAmount]
//     );
//     const newBillId = billResult.rows[0].bill_id;

//     // Update all unconfirmed bill items with the new bill_id
//     await client.query(
//       `UPDATE bill_items
//        SET bill_id = $1
//        WHERE bill_id IS NULL`,
//       [newBillId]
//     );

//     // Optionally, delete unconfirmed bill items (optional cleanup)
//     await client.query(
//       `DELETE FROM bill_items
//        WHERE bill_id IS NULL`
//     );

//     await client.query("COMMIT");

//     // Fetch the complete bill with all items, including newly associated ones
//     const completeBill = await client.query(
//       `SELECT
//         b.bill_id,
//         b.total_amount,
//         b.created_at,
//         json_agg(
//           json_build_object(
//             'bill_item_id', bi.bill_item_id,
//             'stock_id', bi.stock_id,
//             'quantity', bi.quantity,
//             'subtotal', bi.subtotal,
//             'unit_price', s.unit_price,
//             'drug_name', d.name
//           ) ORDER BY bi.bill_item_id ASC
//         ) AS items
//       FROM bills b
//       JOIN bill_items bi ON b.bill_id = bi.bill_id
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       WHERE b.bill_id = $1
//       GROUP BY b.bill_id, b.total_amount, b.created_at`,
//       [newBillId]
//     );

//     res.status(201).json({
//       message: "Bill confirmed successfully",
//       bill: completeBill.rows[0],
//     });
//   } catch (error: any) {
//     await client.query("ROLLBACK");
//     console.error("Error confirming bill:", error);
//     res.status(500).json({
//       error: "Failed to confirm bill",
//       message: error.message,
//     });
//   } finally {
//     client.release();
//   }
// };//ใช้อันนี้

// export const confirm = async (req: Request, res: Response): Promise<void> => {
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");

//     // Check for existing bill items that need confirmation
//     const billItemsResult = await client.query(`
//       SELECT
//         bi.bill_item_id,
//         bi.stock_id,
//         bi.quantity,
//         bi.subtotal,
//         s.unit_price,
//         d.name AS drug_name
//       FROM bill_items bi
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       WHERE bi.status = 'pending'
//       ORDER BY bi.bill_item_id ASC
//     `);

//     if (billItemsResult.rows.length === 0) {
//       throw new Error("No pending bill items found to confirm");
//     }

//     const billItems = billItemsResult.rows;

//     // Calculate total amount from all unconfirmed items
//     const totalAmount = billItems.reduce(
//       (sum, item) => sum + parseFloat(item.subtotal),
//       0
//     );

//     // Create a new bill
//     const billResult = await client.query(
//       `INSERT INTO bills (total_amount, created_at)
//        VALUES ($1, NOW())
//        RETURNING bill_id`,
//       [totalAmount]
//     );
//     const newBillId = billResult.rows[0].bill_id;

//     // Update all unconfirmed bill items with the new bill_id and status 'confirmed'
//     await client.query(
//       `UPDATE bill_items
//        SET bill_id = $1, status = 'confirmed'
//        WHERE status = 'pending'`,
//       [newBillId]
//     );

//     await client.query("COMMIT");

//     // Fetch the complete bill with all items, including newly associated ones
//     const completeBill = await client.query(
//       `SELECT
//         b.bill_id,
//         b.total_amount,
//         b.created_at,
//         json_agg(
//           json_build_object(
//             'bill_item_id', bi.bill_item_id,
//             'stock_id', bi.stock_id,
//             'quantity', bi.quantity,
//             'subtotal', bi.subtotal,
//             'unit_price', s.unit_price,
//             'drug_name', d.name
//           ) ORDER BY bi.bill_item_id ASC
//         ) AS items
//       FROM bills b
//       JOIN bill_items bi ON b.bill_id = bi.bill_id
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       WHERE b.bill_id = $1
//       GROUP BY b.bill_id, b.total_amount, b.created_at`,
//       [newBillId]
//     );

//     res.status(201).json({
//       message: "Bill confirmed successfully",
//       bill: completeBill.rows[0],
//     });
//   } catch (error: any) {
//     await client.query("ROLLBACK");
//     console.error("Error confirming bill:", error);
//     res.status(500).json({
//       error: "Failed to confirm bill",
//       message: error.message,
//     });
//   } finally {
//     client.release();
//   }
// };

// Example backend: confirm function

// export const confirm = async (req: Request, res: Response): Promise<void> => {
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");

//     const { final_amount } = req.body;

//     const billItemsResult = await client.query(`
//       SELECT
//         bi.bill_item_id,
//         bi.stock_id,
//         bi.quantity,
//         bi.subtotal,
//         s.unit_price,
//         d.name AS drug_name
//       FROM bill_items bi
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       WHERE bi.status = 'pending'
//       ORDER BY bi.bill_item_id ASC
//     `);

//     if (billItemsResult.rows.length === 0) {
//       throw new Error("No pending bill items found to confirm");
//     }

//     const billItems = billItemsResult.rows;

//     const totalAmount = billItems.reduce(
//       (sum, item) => sum + parseFloat(item.subtotal),
//       0
//     );

//     const billResult = await client.query(
//       `INSERT INTO bills (total_amount, created_at)
//        VALUES ($1, NOW())
//        RETURNING bill_id`,
//       [final_amount]
//     );

//     const newBillId = billResult.rows[0].bill_id;

//     await client.query(
//       `UPDATE bill_items
//        SET bill_id = $1, status = 'confirmed'
//        WHERE status = 'pending'`,
//       [newBillId]
//     );

//     await client.query("COMMIT");

//     const completeBill = await client.query(
//       `SELECT
//         b.bill_id,
//         b.total_amount,
//         b.created_at,
//         json_agg(
//           json_build_object(
//             'bill_item_id', bi.bill_item_id,
//             'stock_id', bi.stock_id,
//             'quantity', bi.quantity,
//             'subtotal', bi.subtotal,
//             'unit_price', s.unit_price,
//             'drug_name', d.name
//           ) ORDER BY bi.bill_item_id ASC
//         ) AS items
//       FROM bills b
//       JOIN bill_items bi ON b.bill_id = bi.bill_id
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       WHERE b.bill_id = $1
//       GROUP BY b.bill_id, b.total_amount, b.created_at`,
//       [newBillId]
//     );

//     res.status(201).json({
//       message: "Bill confirmed successfully",
//       bill: completeBill.rows[0],
//     });
//   } catch (error: any) {
//     await client.query("ROLLBACK");
//     console.error("Error confirming bill:", error);
//     res.status(500).json({
//       error: "Failed to confirm bill",
//       message: error.message,
//     });
//   } finally {
//     client.release();
//   }
// };//หี

export const confirm = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { final_amount, discount } = req.body;

    // ดึงข้อมูลรายการสินค้าในบิล
    const billItemsResult = await client.query(`
      SELECT
        bi.bill_item_id,
        bi.stock_id,
        bi.quantity,
        bi.subtotal,
        s.unit_price,
        d.name AS drug_name
      FROM bill_items bi
      JOIN stocks s ON bi.stock_id = s.stock_id
      JOIN drugs d ON s.drug_id = d.drug_id
      WHERE bi.status = 'pending'
      ORDER BY bi.bill_item_id ASC
    `);

    if (billItemsResult.rows.length === 0) {
      throw new Error("No pending bill items found to confirm");
    }

    const billItems = billItemsResult.rows;

    // คำนวณยอดรวมก่อนหักส่วนลด (รวมค่า subtotal ของทุกบิล)
    const totalAmount = billItems.reduce(
      (sum, item) => sum + parseFloat(item.subtotal),
      0
    );

    // คำนวณยอดเงินหลังหักส่วนลดจาก totalAmount
    const discountedAmount = totalAmount - (totalAmount * discount) / 100;

    // ตรวจสอบว่า discount ไม่เกิน totalAmount
    if (discountedAmount < 0) {
      throw new Error("Discounted amount cannot be negative");
    }

    // Insert the bill into the bills table with the discount applied
    const billResult = await client.query(
      `INSERT INTO bills (total_amount, discount, created_at)
       VALUES ($1, $2, NOW())
       RETURNING bill_id`,
      [discountedAmount, discount] // ใช้ discountedAmount ที่คำนวณแล้ว
    );

    const newBillId = billResult.rows[0].bill_id;

    // Update the bill items with the new bill_id and set their status to 'confirmed'
    await client.query(
      `UPDATE bill_items
       SET bill_id = $1, status = 'confirmed'
       WHERE status = 'pending'`,
      [newBillId]
    );

    await client.query("COMMIT");

    const completeBill = await client.query(
      `SELECT
        b.bill_id,
        b.total_amount,
        b.discount,
        b.created_at,
        json_agg(
          json_build_object(
            'bill_item_id', bi.bill_item_id,
            'stock_id', bi.stock_id,
            'quantity', bi.quantity,
            'subtotal', bi.subtotal,
            'unit_price', s.unit_price,
            'drug_name', d.name
          ) ORDER BY bi.bill_item_id ASC
        ) AS items
      FROM bills b
      JOIN bill_items bi ON b.bill_id = bi.bill_id
      JOIN stocks s ON bi.stock_id = s.stock_id
      JOIN drugs d ON s.drug_id = d.drug_id
      WHERE b.bill_id = $1
      GROUP BY b.bill_id, b.total_amount, b.discount, b.created_at`,
      [newBillId]
    );

    res.status(201).json({
      message: "Bill confirmed successfully",
      bill: completeBill.rows[0],
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error confirming bill:", error);
    res.status(500).json({
      error: "Failed to confirm bill",
      message: error.message,
    });
  } finally {
    client.release();
  }
};

export const history = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const { page = 1, searchQuery = "" } = req.query;

  const itemsPerPage = 10;
  const offset = (Number(page) - 1) * itemsPerPage;

  try {
    const searchString = Array.isArray(searchQuery)
      ? searchQuery.join(" ")
      : String(searchQuery);

    const historyQuery = `
      SELECT 
        b.bill_id,
        b.customer_name,
        b.total_amount,
        b.created_at,
        COUNT(bi.bill_item_id) AS item_count
      FROM bills b
      LEFT JOIN bill_items bi ON b.bill_id = bi.bill_id
      WHERE LOWER(b.bill_id::text) LIKE $1
        OR LOWER(b.created_at::text) LIKE $2
      GROUP BY b.bill_id
      ORDER BY b.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const searchPattern = `%${searchString.toLowerCase()}%`;

    const historyResult = await client.query(historyQuery, [
      searchPattern,
      searchPattern,
      itemsPerPage,
      offset,
    ]);

    const countQuery =
      "SELECT COUNT(*) FROM bills WHERE LOWER(bill_id::text) LIKE $1 OR LOWER(created_at::text) LIKE $2";
    const countResult = await client.query(countQuery, [
      searchPattern,
      searchPattern,
    ]);

    const totalRows = parseInt(countResult.rows[0].count, 10);
    const totalPage = Math.ceil(totalRows / itemsPerPage);

    res.status(200).json({
      bills: historyResult.rows,
      totalRows,
      totalPage,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Failed to fetch bill history", details: error.message });
  } finally {
    client.release();
  }
};

export const dashboard = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const { year } = req.params;

  try {
    await client.query("BEGIN");

    const dashboardQuery = `
      SELECT
        EXTRACT(MONTH FROM created_at) AS month,
        SUM(total_amount) AS total_sales
      FROM bills
      WHERE EXTRACT(YEAR FROM created_at) = $1
      GROUP BY month
      ORDER BY month;
    `;
    const dashboardResult = await client.query(dashboardQuery, [year]);

    const expensesQuery = `
      SELECT
        EXTRACT(MONTH FROM datetime) AS month,
        SUM(totalprice) AS total_expenses
      FROM expense
      WHERE EXTRACT(YEAR FROM datetime) = $1
      GROUP BY month
      ORDER BY month;
    `;
    const expensesResult = await client.query(expensesQuery, [year]);

    const monthlyData = dashboardResult.rows.map((row) => {
      const expenseData = expensesResult.rows.find(
        (expense) => expense.month === row.month
      );
      return {
        month: row.month,
        income: row.total_sales || 0,
        expense: expenseData ? expenseData.total_expenses : 0,
      };
    });

    const totalSales = monthlyData.reduce(
      (total, data) => total + parseFloat(data.income || "0"),
      0
    );

    const totalExpenses = monthlyData.reduce(
      (total, data) => total + parseFloat(data.expense || "0"),
      0
    );

    const netProfit = totalSales - totalExpenses;

    // Get the total sales, total expenses, and net profit for all years
    const totalSalesAllYearsQuery = `
      SELECT
        SUM(total_amount) AS total_sales_all_years
      FROM bills;
    `;
    const totalSalesAllYearsResult = await client.query(
      totalSalesAllYearsQuery
    );

    const totalExpensesAllYearsQuery = `
      SELECT
        SUM(totalprice) AS total_expenses_all_years
      FROM expense;
    `;
    const totalExpensesAllYearsResult = await client.query(
      totalExpensesAllYearsQuery
    );

    const totalSalesAllYears =
      totalSalesAllYearsResult.rows[0].total_sales_all_years || 0;
    const totalExpensesAllYears =
      totalExpensesAllYearsResult.rows[0].total_expenses_all_years || 0;
    const netProfitAllYears = totalSalesAllYears - totalExpensesAllYears;

    const finalMonthlyData = monthlyData.filter((data) => data.expense !== 0);

    res.status(200).json({
      monthlyData: finalMonthlyData,
      totalSales: parseFloat(totalSales.toString()),
      totalExpenses: parseFloat(totalExpenses.toString()),
      netProfit: parseFloat(netProfit.toString()),
      totalSalesAllYears: parseFloat(totalSalesAllYears.toString()),
      totalExpensesAllYears: parseFloat(totalExpensesAllYears.toString()),
      netProfitAllYears: parseFloat(netProfitAllYears.toString()),
    });

    await client.query("COMMIT");
  } catch (error: any) {
    await client.query("ROLLBACK");
    res.status(500).json({
      error: "Failed to fetch dashboard data",
      details: error.message,
    });
  } finally {
    client.release();
  }
};

export const getBillInfo = async (
  req: Request,
  res: Response
): Promise<void> => {
  const client = await pool.connect();
  const { bill_id } = req.params;

  // Validate bill_id (check if it's a valid integer)
  if (!bill_id || isNaN(Number(bill_id))) {
    res.status(400).json({ error: "Invalid or missing bill_id" });
    return; // Ensure no further code execution
  }

  try {
    // Fetch bill and treatment details without customer_name, using stock_id instead of bill_item_id
    const billQuery = `
      SELECT 
        b.bill_id, 
        b.total_amount, 
        b.discount,
        b.created_at, 
        json_agg(
          json_build_object(
            'stock_id', bi.stock_id,      
            'drug_name', d.name,
            'quantity', bi.quantity,
            'unit_price', s.unit_price,
            'subtotal', bi.subtotal
          ) ORDER BY bi.stock_id ASC    
        ) AS treatments
      FROM bills b
      JOIN bill_items bi ON b.bill_id = bi.bill_id
      JOIN stocks s ON bi.stock_id = s.stock_id
      JOIN drugs d ON s.drug_id = d.drug_id
      WHERE b.bill_id = $1
      GROUP BY b.bill_id, b.total_amount, b.created_at;
    `;

    const billResult = await client.query(billQuery, [bill_id]);

    if (billResult.rows.length === 0) {
      res.status(404).json({ error: "Bill not found" });
      return;
    }

    const billData = billResult.rows[0];
    res.status(200).json(billData);
  } catch (error: any) {
    console.error("Error fetching bill info:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch bill info", message: error.message });
  } finally {
    client.release();
  }
};
