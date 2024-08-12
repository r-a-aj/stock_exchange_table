const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'SQLWorkbench2.0',
    database: 'stockexchangetable',
    port: 3306
});

const port = 5000;

db.connect((err) => {
    if (err) {
        console.error('DB connection error:', err.stack);
        return;
    }
    console.log('Connected to MySQL database.');

    // Start the server only after successful DB connection
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
});

// Utility function to start a transaction
function startTransaction(callback) {
    db.query('START TRANSACTION', (err, result) => {
        if (err) return callback(err, null);
        callback(null, result);
    });
}

// Utility function to commit a transaction
function commitTransaction(callback) {
    db.query('COMMIT', (err, result) => {
        if (err) return callback(err, null);
        callback(null, result);
    });
}

// Utility function to rollback a transaction
function rollbackTransaction(callback) {
    db.query('ROLLBACK', (err, result) => {
        if (err) return callback(err, null);
        callback(null, result);
    });
}

// Utility function to check presence
function isPresent(price, isp, callback) {
    const isp1 = `SELECT IF(COUNT(sp.id)=0,'No','Yes') AS isPresent FROM sellerpendingorder sp WHERE sp.seller_price=?`;
    const isp2 = `SELECT IF(COUNT(bp.id)=0,'No','Yes') AS isPresent FROM buyerpendingorder bp WHERE bp.buyer_price=?`;
    
    const query = isp === 1 ? isp1 : isp2;

    db.query(query, [price], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result[0].isPresent);
    });
}

// Utility function to get quantity by price
function getQtyByPrice(price, gqbp, callback) {
    const gqbp1 = `SELECT seller_qty as qty FROM sellerpendingorder WHERE seller_price=?`;
    const gqbp2 = `SELECT buyer_qty as qty FROM buyerpendingorder WHERE buyer_price=?`;

    const query = gqbp === 1 ? gqbp1 : gqbp2;

    db.query(query, [price], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result[0]?.qty || 0);
    });
}

// Utility function to update record
function updateRecord(price, new_qty, up, callback) {
    const up1 = `UPDATE sellerpendingorder SET seller_qty=? WHERE seller_price=?`;
    const up2 = `UPDATE buyerpendingorder SET buyer_qty=? WHERE buyer_price=?`;

    const query = up === 1 ? up1 : up2;

    db.query(query, [new_qty, price], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result);
    });
}

// Utility function to insert record
function insertRecord(qty, price, inr, callback) {
    const inr1 = `INSERT INTO sellerpendingorder(seller_qty, seller_price) VALUES(?, ?)`;
    const inr2 = `INSERT INTO buyerpendingorder(buyer_qty, buyer_price) VALUES(?, ?)`;

    const query = inr === 1 ? inr1 : inr2;

    db.query(query, [qty, price], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result);
    });
}

// Utility function to delete record
function deleteRecord(price, dr, callback) {
    const dr1 = `DELETE FROM sellerpendingorder WHERE seller_price=?`;
    const dr2 = `DELETE FROM buyerpendingorder WHERE buyer_price=?`;

    const query = dr === 1 ? dr1 : dr2;

    db.query(query, [price], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result);
    });
}

// Utility function to insert into completed orders
function insertRecordInCompleted(qty, price, callback) {
    const inrc = `INSERT INTO completedordertable(price, qty) VALUES(?, ?)`;

    db.query(inrc, [price, qty], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result);
    });
}

// Buyer order route
app.post('/buyerorder', (req, res) => {
    const { price, quantity } = req.body;

    startTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });

        isPresent(price, 1, (err, isPresentInSeller) => {
            if (err) {
                rollbackTransaction((rollbackErr) => {
                    if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                    res.status(500).json({ error: err.message });
                });
                return;
            }

            if (isPresentInSeller === 'No') {
                isPresent(price, 2, (err, isPresentInBuyer) => {
                    if (err) {
                        rollbackTransaction((rollbackErr) => {
                            if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                            res.status(500).json({ error: err.message });
                        });
                        return;
                    }

                    if (isPresentInBuyer === 'No') {
                        insertRecord(quantity, price, 2, (err) => {
                            if (err) {
                                rollbackTransaction((rollbackErr) => {
                                    if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                    res.status(500).json({ error: err.message });
                                });
                                return;
                            }
                            commitTransaction((commitErr) => {
                                if (commitErr) {
                                    rollbackTransaction((rollbackErr) => {
                                        if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                        res.status(500).json({ error: commitErr.message });
                                    });
                                    return;
                                }
                                res.json({ message: 'Buyer order added successfully' });
                            });
                        });
                    } else {
                        getQtyByPrice(price, 2, (err, oldQty) => {
                            if (err) {
                                rollbackTransaction((rollbackErr) => {
                                    if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                    res.status(500).json({ error: err.message });
                                });
                                return;
                            }

                            updateRecord(price, parseInt(quantity) + parseInt(oldQty), 2, (err) => {
                                if (err) {
                                    rollbackTransaction((rollbackErr) => {
                                        if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                        res.status(500).json({ error: err.message });
                                    });
                                    return;
                                }
                                commitTransaction((commitErr) => {
                                    if (commitErr) {
                                        rollbackTransaction((rollbackErr) => {
                                            if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                            res.status(500).json({ error: commitErr.message });
                                        });
                                        return;
                                    }
                                    res.json({ message: 'Buyer order quantity updated successfully' });
                                });
                            });
                        });
                    }
                });
            } else {
                getQtyByPrice(price, 1, (err, oldQty) => {
                    if (err) {
                        rollbackTransaction((rollbackErr) => {
                            if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                            res.status(500).json({ error: err.message });
                        });
                        return;
                    }

                    if (parseInt(oldQty) == parseInt(quantity)) {
                        deleteRecord(price, 1, (err) => {
                            if (err) {
                                rollbackTransaction((rollbackErr) => {
                                    if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                    res.status(500).json({ error: err.message });
                                });
                                return;
                            }

                            insertRecordInCompleted(quantity, price, (err) => {
                                if (err) {
                                    rollbackTransaction((rollbackErr) => {
                                        if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                        res.status(500).json({ error: err.message });
                                    });
                                    return;
                                }
                                commitTransaction((commitErr) => {
                                    if (commitErr) {
                                        rollbackTransaction((rollbackErr) => {
                                            if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                            res.status(500).json({ error: commitErr.message });
                                        });
                                        return;
                                    }
                                    res.json({ message: 'Buyer order matched and completed successfully' });
                                });
                            });
                        });
                    } else {
                        if (parseInt(oldQty) > parseInt(quantity)) {
                            updateRecord(price, Math.abs(parseInt(quantity) - parseInt(oldQty)), 1, (err) => {
                                if (err) {
                                    rollbackTransaction((rollbackErr) => {
                                        if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                        res.status(500).json({ error: err.message });
                                    });
                                    return;
                                }

                                insertRecordInCompleted(Math.min(parseInt(oldQty), parseInt(quantity)), price, (err) => {
                                    if (err) {
                                        rollbackTransaction((rollbackErr) => {
                                            if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                            res.status(500).json({ error: err.message });
                                        });
                                        return;
                                    }
                                    commitTransaction((commitErr) => {
                                        if (commitErr) {
                                            rollbackTransaction((rollbackErr) => {
                                                if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                                res.status(500).json({ error: commitErr.message });
                                            });
                                            return;
                                        }
                                        res.json({ message: 'Buyer order partially matched and completed successfully' });
                                    });
                                });
                            });
                        } else {
                            deleteRecord(price, 1, (err) => {
                                if (err) {
                                    rollbackTransaction((rollbackErr) => {
                                        if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                        res.status(500).json({ error: err.message });
                                    });
                                    return;
                                }

                                insertRecord(Math.abs(parseInt(quantity) - parseInt(oldQty)), price, 2, (err) => {
                                    if (err) {
                                        rollbackTransaction((rollbackErr) => {
                                            if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                            res.status(500).json({ error: err.message });
                                        });
                                        return;
                                    }

                                    insertRecordInCompleted(Math.min(parseInt(oldQty), parseInt(quantity)), price, (err) => {
                                        if (err) {
                                            rollbackTransaction((rollbackErr) => {
                                                if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                                res.status(500).json({ error: err.message });
                                            });
                                            return;
                                        }
                                        commitTransaction((commitErr) => {
                                            if (commitErr) {
                                                rollbackTransaction((rollbackErr) => {
                                                    if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                                    res.status(500).json({ error: commitErr.message });
                                                });
                                                return;
                                            }
                                            res.json({ message: 'Buyer order partially matched and completed successfully' });
                                        });
                                    });
                                });
                            });
                        }
                    }
                });
            }
        });
    });
});

// Seller order route
app.post('/sellerorder', (req, res) => {
    const { quantity, price } = req.body;

    startTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });

        isPresent(price, 2, (err, isPresentInBuyer) => {
            if (err) {
                rollbackTransaction((rollbackErr) => {
                    if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                    res.status(500).json({ error: err.message });
                });
                return;
            }

            if (isPresentInBuyer === 'No') {
                isPresent(price, 1, (err, isPresentInSeller) => {
                    if (err) {
                        rollbackTransaction((rollbackErr) => {
                            if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                            res.status(500).json({ error: err.message });
                        });
                        return;
                    }

                    if (isPresentInSeller === 'No') {
                        insertRecord(quantity, price, 1, (err) => {
                            if (err) {
                                rollbackTransaction((rollbackErr) => {
                                    if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                    res.status(500).json({ error: err.message });
                                });
                                return;
                            }
                            commitTransaction((commitErr) => {
                                if (commitErr) {
                                    rollbackTransaction((rollbackErr) => {
                                        if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                        res.status(500).json({ error: commitErr.message });
                                    });
                                    return;
                                }
                                res.json({ message: 'Seller order added successfully' });
                            });
                        });
                    } else {
                        getQtyByPrice(price, 1, (err, oldQty) => {
                            if (err) {
                                rollbackTransaction((rollbackErr) => {
                                    if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                    res.status(500).json({ error: err.message });
                                });
                                return;
                            }

                            updateRecord(price, parseInt(quantity) + parseInt(oldQty), 1, (err) => {
                                if (err) {
                                    rollbackTransaction((rollbackErr) => {
                                        if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                        res.status(500).json({ error: err.message });
                                    });
                                    return;
                                }
                                commitTransaction((commitErr) => {
                                    if (commitErr) {
                                        rollbackTransaction((rollbackErr) => {
                                            if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                            res.status(500).json({ error: commitErr.message });
                                        });
                                        return;
                                    }
                                    res.json({ message: 'Seller order quantity updated successfully' });
                                });
                            });
                        });
                    }
                });
            } else {
                getQtyByPrice(price, 2, (err, oldQty) => {
                    if (err) {
                        rollbackTransaction((rollbackErr) => {
                            if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                            res.status(500).json({ error: err.message });
                        });
                        return;
                    }

                    if (parseInt(oldQty) == parseInt(quantity)) {
                        deleteRecord(price, 2, (err) => {
                            if (err) {
                                rollbackTransaction((rollbackErr) => {
                                    if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                    res.status(500).json({ error: err.message });
                                });
                                return;
                            }

                            insertRecordInCompleted(quantity, price, (err) => {
                                if (err) {
                                    rollbackTransaction((rollbackErr) => {
                                        if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                        res.status(500).json({ error: err.message });
                                    });
                                    return;
                                }
                                commitTransaction((commitErr) => {
                                    if (commitErr) {
                                        rollbackTransaction((rollbackErr) => {
                                            if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                            res.status(500).json({ error: commitErr.message });
                                        });
                                        return;
                                    }
                                    res.json({ message: 'Seller order matched and completed successfully' });
                                });
                            });
                        });
                    } else {
                        if (parseInt(oldQty) > parseInt(quantity)) {
                            updateRecord(price, Math.abs(parseInt(quantity) - parseInt(oldQty)), 2, (err) => {
                                if (err) {
                                    rollbackTransaction((rollbackErr) => {
                                        if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                        res.status(500).json({ error: err.message });
                                    });
                                    return;
                                }

                                insertRecordInCompleted(Math.min(parseInt(oldQty), parseInt(quantity)), price, (err) => {
                                    if (err) {
                                        rollbackTransaction((rollbackErr) => {
                                            if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                            res.status(500).json({ error: err.message });
                                        });
                                        return;
                                    }
                                    commitTransaction((commitErr) => {
                                        if (commitErr) {
                                            rollbackTransaction((rollbackErr) => {
                                                if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                                res.status(500).json({ error: commitErr.message });
                                            });
                                            return;
                                        }
                                        res.json({ message: 'Seller order partially matched and completed successfully' });
                                    });
                                });
                            });
                        } else {
                            deleteRecord(price, 2, (err) => {
                                if (err) {
                                    rollbackTransaction((rollbackErr) => {
                                        if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                        res.status(500).json({ error: err.message });
                                    });
                                    return;
                                }

                                insertRecord(Math.abs(parseInt(quantity) - parseInt(oldQty)), price, 1, (err) => {
                                    if (err) {
                                        rollbackTransaction((rollbackErr) => {
                                            if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                            res.status(500).json({ error: err.message });
                                        });
                                        return;
                                    }

                                    insertRecordInCompleted(Math.min(parseInt(oldQty), parseInt(quantity)), price, (err) => {
                                        if (err) {
                                            rollbackTransaction((rollbackErr) => {
                                                if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                                res.status(500).json({ error: err.message });
                                            });
                                            return;
                                        }
                                        commitTransaction((commitErr) => {
                                            if (commitErr) {
                                                rollbackTransaction((rollbackErr) => {
                                                    if (rollbackErr) console.error('Rollback error:', rollbackErr.message);
                                                    res.status(500).json({ error: commitErr.message });
                                                });
                                                return;
                                            }
                                            res.json({ message: 'Seller order partially matched and completed successfully' });
                                        });
                                    });
                                });
                            });
                        }
                    }
                });
            }
        });
    });
});

// API to fetch pending orders
app.get('/orders/pending', (req, res) => {
    db.query(`SELECT * FROM PendingOrderTable`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API to fetch completed orders
app.get('/orders/completed', (req, res) => {
    db.query(`SELECT * FROM CompletedOrderTable`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API to fetch pending buyer orders
app.get('/orders/buyers', (req, res) => {
    db.query(`SELECT * FROM buyerpendingorder`, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
});
  
// API to fetch pending seller orders
app.get('/orders/sellers', (req, res) => {
    db.query(`SELECT * FROM sellerpendingorder`, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
});

// Route to clear buyer pending orders
app.delete('/orders/clear/buyers', (req, res) => {
    db.query(`DELETE FROM buyerpendingorder`, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Buyer pending orders cleared successfully' });
    });
});

// Route to clear seller pending orders
app.delete('/orders/clear/sellers', (req, res) => {
    db.query(`DELETE FROM sellerpendingorder`, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Seller pending orders cleared successfully' });
    });
});

// Route to clear completed orders
app.delete('/orders/clear/completed', (req, res) => {
    db.query(`DELETE FROM completedordertable`, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Completed orders cleared successfully' });
    });
});
