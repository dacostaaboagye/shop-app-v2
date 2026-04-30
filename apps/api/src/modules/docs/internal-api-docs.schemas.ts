import {
  adminAuditListQuerySchema,
  adminAuditListResponseSchema,
  adminPermissionListQuerySchema,
  adminPermissionListResponseSchema,
  adminRoleListQuerySchema,
  adminRoleListResponseSchema,
  adminStockBalanceListResponseSchema,
  approveStockSupplyRequestSchema,
  assignVariantRequestSchema,
  authPermissionSetSchema,
  authUserSchema,
  batchAssignVariantRequestSchema,
  batchAssignVariantResponseSchema,
  createStockSupplyRequestSchema,
  dispatchStockSupplyRequestSchema,
  gtnResponseSchema,
  invoiceListQuerySchema,
  invoiceListResponseSchema,
  invoiceResponseSchema,
  locationAssignmentListQuerySchema,
  locationAssignmentListResponseSchema,
  locationStockBalanceQuerySchema,
  managerDashboardSummaryQuerySchema,
  managerDashboardSummaryResponseSchema,
  markAllNotificationsReadResponseSchema,
  markNotificationReadResponseSchema,
  notificationListQuerySchema,
  notificationListResponseSchema,
  ownershipEventResponseSchema,
  processPosPaymentRequestSchema,
  processPosReturnRequestSchema,
  reassignVariantRequestSchema,
  referenceSchema,
  stockSupplyRequestListQuerySchema,
  stockSupplyRequestListResponseSchema,
  stockSupplyRequestResponseSchema,
  workerAssignmentListQuerySchema,
  workerAssignmentListResponseSchema,
  workerDashboardSummaryQuerySchema,
  workerDashboardSummaryResponseSchema,
} from "@shop/contracts";
import { type ZodType, z } from "zod";

export type InternalApiDocSchemas = {
  pathParams?: ZodType;
  query?: ZodType;
  requestBody?: ZodType;
  response?: ZodType;
};

const notificationKeyParamsSchema = z.object({
  notificationKey: z.string().uuid(),
});

const recordIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const referenceParamsSchema = z.object({
  reference: referenceSchema,
});

const dispatchSupplyRequestResponseSchema = z.object({
  gtn: gtnResponseSchema,
  supplyRequest: stockSupplyRequestResponseSchema,
});

export const internalApiDocSchemas = {
  accessAuditList: {
    query: adminAuditListQuerySchema,
    response: adminAuditListResponseSchema,
  },
  accessPermissionList: {
    query: adminPermissionListQuerySchema,
    response: adminPermissionListResponseSchema,
  },
  accessRoleList: {
    query: adminRoleListQuerySchema,
    response: adminRoleListResponseSchema,
  },
  authMe: { response: authUserSchema },
  authPermissionSet: { response: authPermissionSetSchema },
  managerAssign: {
    requestBody: assignVariantRequestSchema,
    response: ownershipEventResponseSchema,
  },
  managerBatchAssign: {
    requestBody: batchAssignVariantRequestSchema,
    response: batchAssignVariantResponseSchema,
  },
  managerDashboardSummary: {
    query: managerDashboardSummaryQuerySchema,
    response: managerDashboardSummaryResponseSchema,
  },
  managerGetSale: {
    pathParams: referenceParamsSchema,
    response: invoiceResponseSchema,
  },
  managerListAssignments: {
    query: locationAssignmentListQuerySchema,
    response: locationAssignmentListResponseSchema,
  },
  managerListSales: {
    query: invoiceListQuerySchema,
    response: invoiceListResponseSchema,
  },
  managerStockBalances: {
    query: locationStockBalanceQuerySchema,
    response: adminStockBalanceListResponseSchema,
  },
  markAllNotificationsRead: {
    response: markAllNotificationsReadResponseSchema,
  },
  markNotificationRead: {
    pathParams: notificationKeyParamsSchema,
    response: markNotificationReadResponseSchema,
  },
  notificationList: {
    query: notificationListQuerySchema,
    response: notificationListResponseSchema,
  },
  reassignVariant: {
    requestBody: reassignVariantRequestSchema,
    response: ownershipEventResponseSchema,
  },
  supplyRequestApprove: {
    pathParams: recordIdParamsSchema,
    requestBody: approveStockSupplyRequestSchema,
    response: stockSupplyRequestResponseSchema,
  },
  supplyRequestCreate: {
    requestBody: createStockSupplyRequestSchema,
    response: stockSupplyRequestResponseSchema,
  },
  supplyRequestDispatch: {
    pathParams: recordIdParamsSchema,
    requestBody: dispatchStockSupplyRequestSchema,
    response: dispatchSupplyRequestResponseSchema,
  },
  supplyRequestList: {
    query: stockSupplyRequestListQuerySchema,
    response: stockSupplyRequestListResponseSchema,
  },
  workerDashboardSummary: {
    query: workerDashboardSummaryQuerySchema,
    response: workerDashboardSummaryResponseSchema,
  },
  workerGetSale: {
    pathParams: referenceParamsSchema,
    response: invoiceResponseSchema,
  },
  workerListAssignments: {
    query: workerAssignmentListQuerySchema,
    response: workerAssignmentListResponseSchema,
  },
  workerListSales: {
    query: invoiceListQuerySchema,
    response: invoiceListResponseSchema,
  },
  workerProcessSale: {
    requestBody: processPosPaymentRequestSchema,
    response: invoiceResponseSchema,
  },
  workerReturnSale: {
    pathParams: referenceParamsSchema,
    requestBody: processPosReturnRequestSchema,
    response: invoiceResponseSchema,
  },
  workerStockBalances: {
    query: locationStockBalanceQuerySchema,
    response: adminStockBalanceListResponseSchema,
  },
} satisfies Record<string, InternalApiDocSchemas>;
