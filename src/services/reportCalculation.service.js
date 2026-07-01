import { roundMoney } from "../utils/reportDate.js";

function getSkuTotalCostPerUnit(cost) {
    return (
        Number(cost.productCost || 0) +
        Number(cost.productGst || 0) +
        Number(cost.packingCost || 0) +
        Number(cost.packingGst || 0) +
        Number(cost.otherCost || 0)
    );
}

function groupBySku(orderRows, paymentRows, skuCosts) {
    const skuMap = new Map();

    orderRows.forEach((row) => {
        if (!skuMap.has(row.sku)) {
            skuMap.set(row.sku, {
                sku: row.sku,
                asin: row.asin,
                productName: row.productName,
                quantitySold: 0,
                sales: 0,
                settlement: 0,
                cogs: 0,
                profit: 0,
                roi: null,
                returns: 0,
            });
        }

        const current = skuMap.get(row.sku);

        current.quantitySold += Number(row.quantity || 0);
        current.sales +=
            Number(row.itemPrice || 0) +
            Number(row.shippingPrice || 0) +
            Number(row.giftWrapPrice || 0);
    });

    paymentRows.forEach((row) => {
        if (!row.sku || !skuMap.has(row.sku)) return;

        const current = skuMap.get(row.sku);

        current.settlement += Number(row.total || 0);

        if (Number(row.total || 0) < 0) {
            current.returns += Math.abs(Number(row.total || 0));
        }
    });

    skuCosts.forEach((cost) => {
        if (!skuMap.has(cost.sku)) return;

        const current = skuMap.get(cost.sku);

        current.cogs = Number(cost.totalCogs || 0);
        current.profit = current.settlement - current.cogs;
        current.roi = current.cogs > 0 ? (current.profit / current.cogs) * 100 : null;
    });

    return Array.from(skuMap.values()).map((item) => ({
        ...item,
        sales: roundMoney(item.sales),
        settlement: roundMoney(item.settlement),
        cogs: roundMoney(item.cogs),
        profit: roundMoney(item.profit),
        roi: item.roi === null ? null : roundMoney(item.roi),
        returns: roundMoney(item.returns),
    }));
}

function buildOrderWiseBreakdown(orderRows, paymentRows, skuCosts) {
    const orderMap = new Map();
    const costBySku = new Map();

    skuCosts.forEach((cost) => {
        costBySku.set(
            cost.sku,
            Number(cost.totalCostPerUnit || 0) || getSkuTotalCostPerUnit(cost),
        );
    });

    orderRows.forEach((row) => {
        if (!orderMap.has(row.orderId)) {
            orderMap.set(row.orderId, {
                orderId: row.orderId,
                orderDate: row.orderDate,
                skuSet: new Set(),
                quantity: 0,
                sales: 0,
                settlement: 0,
                cogs: 0,
                profit: 0,
                status: row.itemStatus || "",
            });
        }

        const current = orderMap.get(row.orderId);

        current.skuSet.add(row.sku);
        current.quantity += Number(row.quantity || 0);
        current.sales +=
            Number(row.itemPrice || 0) +
            Number(row.shippingPrice || 0) +
            Number(row.giftWrapPrice || 0);

        current.cogs += Number(row.quantity || 0) * Number(costBySku.get(row.sku) || 0);
    });

    paymentRows.forEach((row) => {
        if (!row.orderId || !orderMap.has(row.orderId)) return;

        const current = orderMap.get(row.orderId);

        current.settlement += Number(row.total || 0);
    });

    return Array.from(orderMap.values()).map((item) => {
        const profit = item.settlement - item.cogs;

        return {
            orderId: item.orderId,
            orderDate: item.orderDate,
            skuCount: item.skuSet.size,
            quantity: item.quantity,
            sales: roundMoney(item.sales),
            settlement: roundMoney(item.settlement),
            cogs: roundMoney(item.cogs),
            profit: roundMoney(profit),
            status: item.status,
        };
    });
}

function buildStateWiseBreakdown(orderRows, paymentRows, skuCosts) {
    const stateMap = new Map();
    const costBySku = new Map();
    const settlementByOrderId = new Map();

    skuCosts.forEach((cost) => {
        costBySku.set(
            cost.sku,
            Number(cost.totalCostPerUnit || 0) || getSkuTotalCostPerUnit(cost),
        );
    });

    paymentRows.forEach((row) => {
        if (!row.orderId) return;

        settlementByOrderId.set(
            row.orderId,
            Number(settlementByOrderId.get(row.orderId) || 0) + Number(row.total || 0),
        );
    });

    orderRows.forEach((row) => {
        const state = row.shipState || "Unknown";

        if (!stateMap.has(state)) {
            stateMap.set(state, {
                state,
                orderIds: new Set(),
                quantity: 0,
                sales: 0,
                cogs: 0,
                settlement: 0,
            });
        }

        const current = stateMap.get(state);

        current.orderIds.add(row.orderId);
        current.quantity += Number(row.quantity || 0);
        current.sales +=
            Number(row.itemPrice || 0) +
            Number(row.shippingPrice || 0) +
            Number(row.giftWrapPrice || 0);

        current.cogs += Number(row.quantity || 0) * Number(costBySku.get(row.sku) || 0);
    });

    Array.from(stateMap.values()).forEach((stateItem) => {
        stateItem.orderIds.forEach((orderId) => {
            stateItem.settlement += Number(settlementByOrderId.get(orderId) || 0);
        });
    });

    return Array.from(stateMap.values()).map((item) => ({
        state: item.state,
        orders: item.orderIds.size,
        quantity: item.quantity,
        sales: roundMoney(item.sales),
        cogs: roundMoney(item.cogs),
        profit: roundMoney(item.settlement - item.cogs),
    }));
}

export function calculateAmazonReport({ orderRows, paymentRows, skuCosts }) {
    const validOrderRows = orderRows.filter((row) => Number(row.quantity || 0) > 0);

    const uniqueOrderIds = new Set(validOrderRows.map((row) => row.orderId));

    const sales = validOrderRows.reduce((total, row) => {
        return (
            total +
            Number(row.itemPrice || 0) +
            Number(row.shippingPrice || 0) +
            Number(row.giftWrapPrice || 0)
        );
    }, 0);

    const settlement = paymentRows.reduce(
        (total, row) => total + Number(row.total || 0),
        0,
    );

    const fees = paymentRows.reduce((total, row) => {
        return (
            total +
            Number(row.sellingFees || 0) +
            Number(row.fbaFees || 0) +
            Number(row.otherTransactionFees || 0)
        );
    }, 0);

    const returns = paymentRows.reduce((total, row) => {
        const transactionType = String(row.transactionType || "").toLowerCase();
        const description = String(row.description || "").toLowerCase();

        if (
            transactionType.includes("refund") ||
            description.includes("refund") ||
            Number(row.total || 0) < 0
        ) {
            return total + Math.abs(Number(row.total || 0));
        }

        return total;
    }, 0);

    const cogs = skuCosts.reduce(
        (total, cost) => total + Number(cost.totalCogs || 0),
        0,
    );

    const adSpend = 0;
    const netProfit = settlement - cogs - adSpend;
    const roi = cogs > 0 ? (netProfit / cogs) * 100 : null;

    const profitLoss = {
        sales: roundMoney(sales),
        refunds: roundMoney(returns),
        amazonFees: roundMoney(fees),
        otherAdjustments: roundMoney(
            paymentRows.reduce((total, row) => total + Number(row.other || 0), 0),
        ),
        netSettlement: roundMoney(settlement),
        cogs: roundMoney(cogs),
        adSpend,
        netProfit: roundMoney(netProfit),
        roi: roi === null ? null : roundMoney(roi),
    };

    const orderSummary = {
        totalOrders: uniqueOrderIds.size,
        totalOrderItems: validOrderRows.length,
        totalQuantitySold: validOrderRows.reduce(
            (total, row) => total + Number(row.quantity || 0),
            0,
        ),
        cancelledOrders: orderRows.filter((row) => {
            const orderStatus = String(row.orderStatus || "").toLowerCase();
            const itemStatus = String(row.itemStatus || "").toLowerCase();

            return orderStatus.includes("cancel") || itemStatus.includes("cancel");
        }).length,
        returnedOrders: 0,
        uniqueSkus: new Set(validOrderRows.map((row) => row.sku)).size,
    };

    return {
        summary: {
            netProfit: roundMoney(netProfit),
            orders: uniqueOrderIds.size,
            roi: roi === null ? null : roundMoney(roi),
            returns: roundMoney(returns),
            settlement: roundMoney(settlement),
            adSpend,
            cogs: roundMoney(cogs),
            sales: roundMoney(sales),
            expenses: roundMoney(Math.abs(fees)),
            fees: roundMoney(fees),
        },
        breakdowns: {
            profitLoss,
            orderSummary,
            skuWiseBreakdown: groupBySku(validOrderRows, paymentRows, skuCosts),
            orderWiseBreakdown: buildOrderWiseBreakdown(
                validOrderRows,
                paymentRows,
                skuCosts,
            ),
            stateWiseBreakdown: buildStateWiseBreakdown(
                validOrderRows,
                paymentRows,
                skuCosts,
            ),
        },
    };
}