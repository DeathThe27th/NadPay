/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import { NadPay } from "generated";
import type {
  NadPay_Claimed,
  NadPay_ClaimedAsUsdc,
  NadPay_RecipientsSaved,
  NadPay_Reclaimed,
  NadPay_RoundCreated,
} from "generated";

NadPay.Claimed.handler(async ({ event, context }) => {
  const entity: NadPay_Claimed = {
    id: `${event.chainId}_${event.transaction.hash}_${event.logIndex}`,
    transactionHash: event.transaction.hash,
    blockNumber: event.block.number,
    roundId: event.params.roundId,
    recipient: event.params.recipient,
    amount: event.params.amount,
  };

  context.NadPay_Claimed.set(entity);
});

NadPay.ClaimedAsUsdc.handler(async ({ event, context }) => {
  const entity: NadPay_ClaimedAsUsdc = {
    id: `${event.chainId}_${event.transaction.hash}_${event.logIndex}`,
    transactionHash: event.transaction.hash,
    blockNumber: event.block.number,
    roundId: event.params.roundId,
    recipient: event.params.recipient,
    amountMon: event.params.amountMon,
    usdcOut: event.params.usdcOut,
  };

  context.NadPay_ClaimedAsUsdc.set(entity);
});

NadPay.RecipientsSaved.handler(async ({ event, context }) => {
  const entity: NadPay_RecipientsSaved = {
    id: `${event.chainId}_${event.transaction.hash}_${event.logIndex}`,
    transactionHash: event.transaction.hash,
    blockNumber: event.block.number,
    payer: event.params.payer,
    count: event.params.count,
    total: event.params.total,
  };

  context.NadPay_RecipientsSaved.set(entity);
});

NadPay.Reclaimed.handler(async ({ event, context }) => {
  const entity: NadPay_Reclaimed = {
    id: `${event.chainId}_${event.transaction.hash}_${event.logIndex}`,
    transactionHash: event.transaction.hash,
    blockNumber: event.block.number,
    roundId: event.params.roundId,
    payer: event.params.payer,
    amount: event.params.amount,
  };

  context.NadPay_Reclaimed.set(entity);
});

NadPay.RoundCreated.handler(async ({ event, context }) => {
  const entity: NadPay_RoundCreated = {
    id: `${event.chainId}_${event.transaction.hash}_${event.logIndex}`,
    transactionHash: event.transaction.hash,
    blockNumber: event.block.number,
    roundId: event.params.roundId,
    payer: event.params.payer,
    totalFunded: event.params.totalFunded,
    deadline: event.params.deadline,
  };

  context.NadPay_RoundCreated.set(entity);
});
