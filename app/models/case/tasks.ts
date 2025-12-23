import type { ObjectSchema, SchemaToType, UnionSchema, UnionVariant } from "~/models/base_schema_types";
import { TrackingSchema } from "~/models/common/tracking";
import { DocumentSubTypeSchema } from "~/models/common/document";
import { StageEnumSchema } from "~/models/config/tasks";

// Helper schemas
const DocumentIdsSchema = {
    type: "object" as const,
    fields: {
        document_id: {
            type: "string" as const,
            label: "Document ID"
        }
    }
} as const satisfies ObjectSchema;

const ApplicationIdsSchema = {
    type: "object" as const,
    fields: {
        case_application_id: {
            type: "string" as const,
            label: "Case Application Id"
        }
    }
} as const satisfies ObjectSchema;

const RequirementIdsSchema = {
    type: "object" as const,
    fields: {
        case_requirement_id: {
            type: "string" as const,
            label: "Case Requirement Id"
        }
    }
} as const satisfies ObjectSchema;

const UserTypeAndIdSchema = {
    type: "object" as const,
    fields: {
        user_type_key: {
            type: "string" as const,
            label: "User Type Key"
        },
        user_id: {
            type: "string" as const,
            label: "User ID"
        }
    }
} as const satisfies ObjectSchema;

/** Acknowledged class to store data relevant to document acknowledgement */
const AcknowledgedSchema = {
    type: "object" as const,
    label: "Acknowledged",
    fields: {
        action_acknowledged_method_key: {
            type: "enum" as const,
            label: "Acknowledged Method",
            options: {
                email: "Email",
                phone: "Phone",
                client_portal: "Client Portal",
                in_person: "In Person",
                video_call: "Video Call"
            },
        },
        action_acknowledged_date: {
            type: "datetime" as const,
            label: "Date Acknowledged",
        },
        action_acknowledged_by: {
            type: "string" as const,
            label: "Acknowledged By",
        },
        document_ids: {
            type: "array" as const,
            label: "Document IDs",
            itemSchema: DocumentIdsSchema
        }
    }
} as const satisfies ObjectSchema;

const TaskActionSchema = {
    type: "object" as const,
    label: "Task Action",
    fields: {
        action_id: {
            type: "string" as const,
            label: "ID"
        },
        action_type_key: {
            type: "enum" as const,
            label: "Action Type",
            options: {
                request_document: "Request Document",
                request_information: "Request Information",
                acknowledge_document: "Acknowledge Document"
            }
        },
        action_advisor_request_text: {
            type: "string" as const,
            label: "Request from Advisor"
        },
        action_client_reply_text: {
            type: "string" as const,
            label: "Response from Client",
            validation: { maxLength: 1000 }
        },
        action_status_key: {
            type: "enum" as const,
            label: "Action Status",
            options: {
                awaiting_response: "Awaiting Response",
                awaiting_approval: "Awaiting Approval",
                approved: "Approved"
            }
        },
        acknowledged: {
            ...AcknowledgedSchema,
            label: "Acknowledged"
        }
    }
} as const satisfies ObjectSchema;

const TaskCommentSchema = {
    type: "object" as const,
    label: "Task Comment",
    fields: {
        id: {
            type: "string" as const,
            label: "ID"
        },
        /** Read-only field */
        array_id: {
            type: "string" as const,
            label: "Array ID"
        },
        task_comment: {
            type: "string" as const,
            label: "Comment",
            validation: { maxLength: 1000 }
        },
        comment_date: {
            type: "datetime" as const,
            label: "Comment Date"
        },
        created_by: {
            ...UserTypeAndIdSchema,
            label: "Created By"
        },
        /** Is this an auto-generated audit entry */
        is_audit: {
            type: "boolean" as const,
            label: "Is Audit"
        }
    }
} as const satisfies ObjectSchema;

const ComplianceCheckFlagsOutcomesSchema = {
    type: "object" as const,
    label: "Compliance Check Flags Outcomes",
    fields: {
        flag_array_id: {
            type: "string" as const,
            label: "Flag Array Id"
        },
        flag_result_key: {
            type: "enum" as const,
            label: "Flag Result",
            options: {
                pass: "Pass",
                fail: "Fail"
            }
        }
    }
} as const satisfies ObjectSchema;

/** Compliance review check details */
const ComplianceReviewCheckItemSchema = {
    type: "object" as const,
    label: "Compliance Review Check Item",
    fields: {
        compliance_check_outcome_key: {
            type: "enum" as const,
            label: "Check Outcome",
            options: {
                pass: "Pass",
                fail: "Fail"
            }
        },
        compliance_check_by_user_id: {
            type: "string" as const,
            label: "Check by User ID"
        },
        compliance_check_start_date: {
            type: "datetime" as const,
            label: "Check Start Date"
        },
        compliance_check_complete_date: {
            type: "datetime" as const,
            label: "Check Complete Date"
        },
        compliance_check_failure_reason_keys: {
            type: "array" as const,
            label: "Check Failure Reasons",
            itemSchema: {
                type: "enum" as const,
                options: {
                    missing_documentation: "Missing Documentation",
                    missing_data: "Missing Data",
                    advice_issue: "Advice Issue",
                    other: "Other"
                }
            }
        },
        compliance_check_note: {
            type: "string" as const,
            label: "Check Note"
        },
        compliance_check_flags_outcomes: {
            type: "array" as const,
            label: "Check Flags Outcomes",
            itemSchema: ComplianceCheckFlagsOutcomesSchema
        }
    }
} as const satisfies ObjectSchema;

/** Compliance review task type details */
const ComplianceReviewFlagItemSchema = {
    type: "object" as const,
    label: "Compliance Review Flag Item",
    fields: {
        compliance_review_type_key: {
            type: "enum" as const,
            label: "Compliance Review Type",
            options: {
                random: "Random",
                high_risk: "High Risk",
                thematic: "Thematic",
                re_check: "Re-check"
            }
        },
        compliance_review_type_created_at: {
            type: "datetime" as const,
            label: "Review Type Created At"
        },
        compliance_review_trigger_key: {
            type: "enum" as const,
            label: "Review Trigger",
            options: {
                system_generated: "System Generated",
                user_generated: "User Generated"
            }
        },
        compliance_review_trigger_by_user_id: {
            type: "string" as const,
            label: "Review Triggered By User ID",
            validation: { maxLength: 100 }
        }
    }
} as const satisfies ObjectSchema;

/** Task type 'Compliance' details */
const ComplianceTaskDetailsSchema = {
    type: "object" as const,
    label: "Compliance Task Details",
    fields: {
        document_type_client_key: {
            type: "string" as const,
            label: "Client Document Type"
        }
    }
} as const satisfies ObjectSchema;

const ConditionsSchema = {
    type: "object" as const,
    label: "Conditions",
    fields: {
        kyc_requirement_type_key: {
            type: "array" as const,
            label: "Requirement Type",
            itemSchema: {
                type: "string" as const
            }
        },
        application_type_key: {
            type: "array" as const,
            label: "Application Type",
            itemSchema: {
                type: "string" as const
            }
        },
        kyc_mortgage_requirement_transaction_type_key: {
            type: "array" as const,
            label: "Mortgage Requirement Transaction Type",
            itemSchema: {
                type: "string" as const
            }
        },
        mortgage_application_transaction_type_key: {
            type: "array" as const,
            label: "Mortgage Application Transaction Type",
            itemSchema: {
                type: "string" as const
            }
        },
        "recommended_product.mortgage_application_transaction_type_key": {
            type: "array" as const,
            label: "Recommended Product Mortgage Application Transaction Type",
            itemSchema: {
                type: "string" as const
            }
        }
    }
} as const satisfies ObjectSchema;

const TaskNotRequiredConditionSchema = {
    type: "object" as const,
    label: "Task Not Required Condition",
    fields: {
        collection: {
            type: "string" as const,
            label: "Collection"
        },
        conditions: {
            ...ConditionsSchema,
            label: "Conditions"
        },
        event: {
            type: "string" as const,
            label: "Event"
        },
        type: {
            type: "string" as const,
            label: "Type"
        }
    }
} as const satisfies ObjectSchema;

const TaskTypeAdhocDetailsSchema = {
    type: "object" as const,
    label: "Task Type Adhoc Details",
    fields: {}
} as const satisfies ObjectSchema;

const TaskTypeChaseDetailsSchema = {
    type: "object" as const,
    label: "Chase Details",
    fields: {
        task_open_status: {
            type: "enum" as const,
            label: "Status",
            options: {
                open: "Open",
                closed: "Closed"
            }
        },
        task_chase_who_key: {
            type: "enum" as const,
            label: "Chase Type",
            options: {
                client: "Client",
                lender: "Lender",
                insurance_provider: "Insurance Provider",
                solicitor: "Solicitor"
            },
            validation: { required: true }
        },
        /** @deprecated */
        task_due_date: {
            type: "datetime" as const,
            label: "Due Date",
            validation: { required: true }
        }
    }
} as const satisfies ObjectSchema;

/** Details for 'Compliance' task type */
const TaskTypeComplianceDetailsSchema = {
    type: "object" as const,
    label: "Task Type Compliance Details",
    fields: {
        required_document: {
            ...DocumentSubTypeSchema,
            label: "Document Type",
        },
        task_next_review_date: {
            type: "datetime" as const,
            label: "Next Review Date"
        },
        task_completion_status_key: {
            type: "enum" as const,
            label: "Task Completion Status",
            options: {
                "true": "True",
                "false": "False"
            }
        },
        task_completion_date: {
            type: "datetime" as const,
            label: "Task Completion Date",
        },
        is_task_document_acknowledgement_required: {
            type: "boolean" as const,
            label: "Document Acknowledgement Required"
        },
        created_at_stage: {
            ...StageEnumSchema,
            label: "Created At Stage"
        },
        required_at_stages: {
            type: "array" as const,
            label: "Required At Stages",
            itemSchema: StageEnumSchema
        },
        linked_aml_id: {
            type: "string" as const,
            label: "Linked AML ID"
        },
        not_required_conditions: {
            type: "array" as const,
            label: "Task Not Required Conditions",
            itemSchema: TaskNotRequiredConditionSchema
        },
        task_documents_issued_to_client_date: {
            type: "datetime" as const,
            label: "Task Documents Issued to Client Date"
        }
    }
} as const satisfies ObjectSchema;

/** Compliance review task type details */
const TaskTypeComplianceReviewDetailsSchema = {
    type: "object" as const,
    label: "Task Type Compliance Review Details",
    fields: {
        compliance_review_workflow_status_key: {
            type: "enum" as const,
            label: "Workflow Status",
            options: {
                awaiting_check: "Awaiting Check",
                in_progress: "In Progress",
                awaiting_advisor_action: "Awaiting Advisor Action",
                completed: "Completed",
                cancelled: "Cancelled"
            }
        },
        compliance_review_owner_user_id: {
            type: "string" as const,
            label: "Owner User Id"
        },
        /** kdhkufh  */
        compliance_review_created_at: {
            type: "datetime" as const,
            label: "Review Created At"
        },
        compliance_review_flags: {
            type: "array" as const,
            label: "Review Flags",
            itemSchema: ComplianceReviewFlagItemSchema
        },
        compliance_review_checks: {
            type: "array" as const,
            label: "Review Checks",
            itemSchema: ComplianceReviewCheckItemSchema
        }
    }
} as const satisfies ObjectSchema;

/** Details for 'Housekeeping' task type */
const TaskTypeHousekeepingDetailsSchema = {
    type: "object" as const,
    label: "Task Type Housekeeping Details",
    fields: {}
} as const satisfies ObjectSchema;

/** Stores 3rd party meta data */
const MetaThirdPartySchema = {
    type: "object" as const,
    label: "Meta Third Party",
    fields: {
        is_task_third_party_generated: {
            type: "boolean" as const,
            label: "Is Task 3rd Party Generated?"
        },
        task_third_party_generated_source_key: {
            type: "enum" as const,
            label: "3rd Party Generated Source",
            options: {
                lsl: "LSL"
            }
        },
        task_third_party_generated_id: {
            type: "string" as const,
            label: "3rd Party Generated Id",
            validation: { maxLength: 100 }
        }
    }
} as const satisfies ObjectSchema;

// Base fields shared by all task types
const TaskBaseFields = {
    id: {
        type: "string" as const,
        label: "ID"
    },
    deleted_by_user_type_key: {
        type: "string" as const,
        label: "Deleted By User Type Key"
    },
    is_deleted: {
        type: "boolean" as const,
        label: "Is Deleted",
        validation: { required: false }
    },
    // Reuse tracking fields from TrackingSchema
    ...TrackingSchema.fields,
    last_updated_at: {
        ...TrackingSchema.fields.updated_at,
        label: "Last Updated At"
    },
    last_updated_by: {
        ...TrackingSchema.fields.updated_by,
        label: "Last Updated By"
    },
    version: {
        type: "number" as const,
        label: "Version"
    },
    schema_version: {
        type: "number" as const,
        label: "Schema Version"
    },
    case_id: {
        type: "string" as const,
        label: "Case Id"
    },
    linked_case_application_ids: {
        type: "array" as const,
        label: "Linked Case Application IDs",
        itemSchema: ApplicationIdsSchema
    },
    linked_case_requirement_ids: {
        type: "array" as const,
        label: "Linked Case Requirement IDs",
        itemSchema: RequirementIdsSchema
    },
    unlinked_case_application_ids: {
        type: "array" as const,
        label: "Unlinked Case Application IDs",
        itemSchema: ApplicationIdsSchema
    },
    unlinked_case_requirement_ids: {
        type: "array" as const,
        label: "Unlinked Case Requirement IDs",
        itemSchema: RequirementIdsSchema
    },
    not_required_requirement_ids: {
        type: "array" as const,
        label: "Not Required Requirement IDs",
        itemSchema: RequirementIdsSchema
    },
    document_ids: {
        type: "array" as const,
        label: "Document IDs",
        itemSchema: DocumentIdsSchema
    },
    linked_advisor_ids: {
        type: "array" as const,
        label: "Linked Advisor IDs",
        itemSchema: {
            type: "string" as const
        }
    },
    team_member_id: {
        type: "string" as const,
        label: "Team Member"
    },
    cluster_assignee_id: {
        type: "string" as const,
        label: "Cluster Assignee ID",
        validation: { required: true }
    },
    cluster_task_next_review_date: {
        type: "datetime" as const,
        label: "Cluster Parent Next Review Date"
    },
    governance_assignee_id: {
        type: "string" as const,
        label: "Governance Assignee ID"
    },
    governance_task_next_review_date: {
        type: "datetime" as const,
        label: "Governance Parent Next Review Date"
    },
    closure_workflow_status_task_key: {
        type: "enum" as const,
        label: "Closure Status",
        options: {
            open: "Open",
            closed: "Closed"
        }
    },
    closure_workflow_outcome_task_key: {
        type: "enum" as const,
        label: "Closure Outcome",
        options: {
            task_completed: "Task Completed",
            task_cancelled: "Task Cancelled",
            task_dismissed: "Task Dismissed"
        }
    },
    closure_workflow_task_closed_date: {
        type: "datetime" as const,
        label: "Closure Date"
    },
    task_next_review_date: {
        type: "datetime" as const,
        label: "Next Review Date"
    },
    comments: {
        type: "array" as const,
        label: "Comments",
        itemSchema: TaskCommentSchema
    },
    actions: {
        type: "array" as const,
        label: "Actions",
        itemSchema: TaskActionSchema
    },
    meta_third_party: {
        ...MetaThirdPartySchema,
        label: "Meta Third Party"
    }
} as const;

// Union variants for each task type
const ComplianceTaskVariant = {
    type: "object" as const,
    discriminator: "task_type_key" as const,
    value: "compliance" as const,
    fields: {
        ...TaskBaseFields,
        task_type_key: {
            type: "enum" as const,
            label: "Task Type",
            options: {
                compliance: "Compliance"
            },
            validation: { required: true }
        },
        task_type_compliance_details: {
            ...TaskTypeComplianceDetailsSchema,
            label: "Task Type Compliance Details"
        }
    }
} as const satisfies UnionVariant<"task_type_key", "compliance">;

const HousekeepingTaskVariant = {
    type: "object" as const,
    discriminator: "task_type_key" as const,
    value: "housekeeping" as const,
    fields: {
        ...TaskBaseFields,
        task_type_key: {
            type: "enum" as const,
            label: "Task Type",
            options: {
                housekeeping: "Housekeeping"
            },
            validation: { required: true }
        },
        task_type_housekeeping_details: {
            ...TaskTypeHousekeepingDetailsSchema,
            label: "Task Type Housekeeping Details"
        }
    }
} as const satisfies UnionVariant<"task_type_key", "housekeeping">;

const ChaseTaskVariant = {
    type: "object" as const,
    discriminator: "task_type_key" as const,
    value: "chase" as const,
    fields: {
        ...TaskBaseFields,
        task_type_key: {
            type: "enum" as const,
            label: "Task Type",
            options: {
                chase: "Chase"
            },
            validation: { required: true }
        },
        task_type_chase_details: {
            ...TaskTypeChaseDetailsSchema,
            label: "Task Type Chase Details"
        }
    }
} as const satisfies UnionVariant<"task_type_key", "chase">;

const GeneralTaskVariant = {
    type: "object" as const,
    discriminator: "task_type_key" as const,
    value: "general" as const,
    fields: {
        ...TaskBaseFields,
        task_type_key: {
            type: "enum" as const,
            label: "Task Type",
            options: {
                general: "General"
            },
            validation: { required: true }
        },
        task_type_adhoc_details: {
            ...TaskTypeAdhocDetailsSchema,
            label: "Task Type Adhoc Details"
        }
    }
} as const satisfies UnionVariant<"task_type_key", "general">;

const ClientReviewTaskVariant = {
    type: "object" as const,
    discriminator: "task_type_key" as const,
    value: "client_review" as const,
    fields: {
        ...TaskBaseFields,
        task_type_key: {
            type: "enum" as const,
            label: "Task Type",
            options: {
                client_review: "Client Review"
            },
            validation: { required: true }
        },
        task_type_adhoc_details: {
            ...TaskTypeAdhocDetailsSchema,
            label: "Task Type Adhoc Details"
        }
    }
} as const satisfies UnionVariant<"task_type_key", "client_review">;

const ComplianceReviewTaskVariant = {
    type: "object" as const,
    discriminator: "task_type_key" as const,
    value: "compliance_review" as const,
    fields: {
        ...TaskBaseFields,
        task_type_key: {
            type: "enum" as const,
            label: "Task Type",
            options: {
                compliance_review: "Compliance Review"
            },
            validation: { required: true }
        },
        task_type_compliance_review_details: {
            ...TaskTypeComplianceReviewDetailsSchema,
            label: "Task Type Compliance Review Details"
        }
    }
} as const satisfies UnionVariant<"task_type_key", "compliance_review">;

// Main TaskDocument union schema
export const CaseTaskSchema = {
    type: "union" as const,
    label: "Task Document",
    variants: [
        ComplianceTaskVariant,
        HousekeepingTaskVariant,
        ChaseTaskVariant,
        GeneralTaskVariant,
        ClientReviewTaskVariant,
        ComplianceReviewTaskVariant
    ]
} as const satisfies UnionSchema;

export type CaseTask = SchemaToType<typeof CaseTaskSchema>;
export type CaseComplianceTask = SchemaToType<typeof ComplianceTaskVariant>;
export type CaseHousekeepingTask = SchemaToType<typeof HousekeepingTaskVariant>;
export type CaseChaseTask = SchemaToType<typeof ChaseTaskVariant>;
export type CaseGeneralTask = SchemaToType<typeof GeneralTaskVariant>;
export type CaseClientReviewTask = SchemaToType<typeof ClientReviewTaskVariant>;
export type CaseComplianceReviewTask = SchemaToType<typeof ComplianceReviewTaskVariant>;

// Test objects for each task type
export const testComplianceTask: CaseComplianceTask = {
    task_type_key: "compliance",
    cluster_assignee_id: "cluster-123",
    id: "task-compliance-1",
    created_at: new Date().toISOString(),
    created_by: "user-123",
    created_by_user_type: "user",
    last_updated_at: new Date().toISOString(),
    last_updated_by: "user-123",
    last_updated_by_user_type: "user",
    version: 1,
    schema_version: 1,
    case_id: "case-123",
    task_type_compliance_details: {
        required_document: {
            category: "mortgage_advice",
            sub_category: "mortgage_application_form"
        },
        required_at_stages: ["create_case", "recommend_product", "create_application"],
        task_next_review_date: new Date().toISOString(),
        created_at_stage: "create_case"
    }
};

export const testHousekeepingTask = {
    task_type_key: "housekeeping" as const,
    cluster_assignee_id: "cluster-123",
    id: "task-housekeeping-1",
    created_at: new Date().toISOString(),
    created_by: "user-123",
    created_by_user_type: "user",
    last_updated_at: new Date().toISOString(),
    last_updated_by: "user-123",
    last_updated_by_user_type: "user",
    version: 1,
    schema_version: 1,
    case_id: "case-123",
    task_type_housekeeping_details: {}
} satisfies CaseTask;

export const testChaseTask = {
    task_type_key: "chase" as const,
    cluster_assignee_id: "cluster-123",
    id: "task-chase-1",
    created_at: new Date().toISOString(),
    created_by: "user-123",
    created_by_user_type: "user",
    last_updated_at: new Date().toISOString(),
    last_updated_by: "user-123",
    last_updated_by_user_type: "user",
    version: 1,
    schema_version: 1,
    case_id: "case-123",
    task_type_chase_details: {
        task_chase_who_key: "client" as const,
        task_due_date: new Date().toISOString()
    }
} satisfies CaseTask;

export const testGeneralTask: CaseTask = {
    task_type_key: "general",
    cluster_assignee_id: "cluster-123",
    id: "task-general-1",
    created_at: new Date().toISOString(),
    created_by: "user-123",
    created_by_user_type: "user",
    last_updated_at: new Date().toISOString(),
    last_updated_by: "user-123",
    last_updated_by_user_type: "user",
    version: 1,
    schema_version: 1,
    case_id: "case-123",
    task_type_adhoc_details: {}
};

export const testClientReviewTask: CaseTask = {
    task_type_key: "client_review",
    cluster_assignee_id: "cluster-123",
    id: "task-client-review-1",
    created_at: new Date().toISOString(),
    created_by: "user-123",
    created_by_user_type: "user",
    last_updated_at: new Date().toISOString(),
    last_updated_by: "user-123",
    last_updated_by_user_type: "user",
    version: 1,
    schema_version: 1,
    case_id: "case-123",
    task_type_adhoc_details: {}
};

const testComplianceReviewTask: CaseTask = {
    task_type_key: "compliance_review",
    cluster_assignee_id: "cluster-123",
    id: "task-compliance-review-1",
    created_at: new Date().toISOString(),
    created_by: "user-123",
    created_by_user_type: "user",
    last_updated_at: new Date().toISOString(),
    last_updated_by: "user-123",
    last_updated_by_user_type: "user",
    version: 1,
    schema_version: 1,
    case_id: "case-123",
    task_type_compliance_review_details: {
        compliance_review_workflow_status_key: "awaiting_check",
        compliance_review_owner_user_id: "user-456",
        compliance_review_created_at: new Date().toISOString(),
        compliance_review_flags: [
            {
                compliance_review_type_key: "random",
                compliance_review_type_created_at: new Date().toISOString(),
                compliance_review_trigger_key: "system_generated",
                compliance_review_trigger_by_user_id: "user-789"
            }
        ],
        compliance_review_checks: [
            {
                compliance_check_outcome_key: "pass",
                compliance_check_by_user_id: "user-456",
                compliance_check_start_date: new Date().toISOString(),
                compliance_check_complete_date: new Date().toISOString()
            }
        ]
    }
};

