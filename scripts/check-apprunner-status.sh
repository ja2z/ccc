#!/bin/bash

# Check App Runner service and operation status
# Usage: ./scripts/check-apprunner-status.sh [service-name]

set -e

export AWS_PROFILE=saml
export AWS_CA_BUNDLE=""
export PYTHONHTTPSVERIFY=0

REGION="${AWS_REGION:-us-west-2}"
SERVICE_NAME="${1:-commerce-control-center}"

aws_cmd() {
    aws "$@" --no-verify-ssl 2> >(grep -v "InsecureRequestWarning" >&2)
}

# Get service ARN and ServiceId
SERVICE_ARN=$(aws_cmd apprunner list-services --region "$REGION" \
    --query "ServiceSummaryList[?ServiceName=='$SERVICE_NAME'].ServiceArn" --output text 2>/dev/null || true)

if [ -z "$SERVICE_ARN" ]; then
    echo "Service '$SERVICE_NAME' not found."
    exit 1
fi

echo "=== Service Status ==="
aws_cmd apprunner describe-service --service-arn "$SERVICE_ARN" --region "$REGION" \
    --query 'Service.{Status:Status,ServiceUrl:ServiceUrl,CreatedAt:CreatedAt}' --output table

echo ""
echo "=== Recent Operations ==="
aws_cmd apprunner list-operations --service-arn "$SERVICE_ARN" --region "$REGION" \
    --query 'OperationSummaryList[0:5].{Type:Type,Status:Status,StartedAt:StartedAt,UpdatedAt:UpdatedAt}' --output table

echo ""
echo "=== Deployment logs (last 50 lines) ==="
SVC_JSON=$(aws_cmd apprunner describe-service --service-arn "$SERVICE_ARN" --region "$REGION" --output json)
SERVICE_ID=$(echo "$SVC_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Service',{}).get('ServiceId',''))" 2>/dev/null)
LOG_GROUP="/aws/apprunner/$SERVICE_NAME/$SERVICE_ID/service"

# Fallback: find log group by prefix if ServiceId missing from describe-service response
if [ -z "$SERVICE_ID" ]; then
    LOG_GROUP=$(aws_cmd logs describe-log-groups --log-group-name-prefix "/aws/apprunner/$SERVICE_NAME/" --region "$REGION" \
        --query 'logGroups[?contains(logGroupName, `/service`)].logGroupName | [0]' --output text 2>/dev/null || true)
fi

if [ -n "$LOG_GROUP" ] && [ "$LOG_GROUP" != "None" ]; then
    STREAMS=$(aws_cmd logs describe-log-streams --log-group-name "$LOG_GROUP" --region "$REGION" \
        --order-by LastEventTime --descending --max-items 5 --output json 2>/dev/null | \
        python3 -c "import sys,json; s=json.load(sys.stdin).get('logStreams',[]); d=[x['logStreamName'] for x in s if 'deployment/' in x.get('logStreamName','')]; print(d[0] if d else '')" 2>/dev/null || true)
    if [ -n "$STREAMS" ]; then
        aws_cmd logs get-log-events --log-group-name "$LOG_GROUP" --log-stream-name "$STREAMS" \
            --region "$REGION" --limit 80 --query 'events[*].message' --output text 2>/dev/null | tr '\t' '\n'
    else
        echo "No deployment streams. View: AWS Console -> App Runner -> $SERVICE_NAME -> Activity"
    fi
else
    echo "View logs: AWS Console -> App Runner -> $SERVICE_NAME -> Activity -> select operation"
fi
