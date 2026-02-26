#!/bin/bash

# Deploy Commerce Control Center to AWS App Runner
# See: AWS App Runner Setup Plan

set -e

# Project root (where .env lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Set AWS profile and disable SSL verification (per aws-cli-usage.mdc)
export AWS_PROFILE=saml
export AWS_CA_BUNDLE=""
export PYTHONHTTPSVERIFY=0

REGION="${AWS_REGION:-us-west-2}"
SERVICE_NAME="commerce-control-center"

# AWS CLI command wrapper (per aws-cli-usage.mdc)
aws_cmd() {
    aws "$@" --no-verify-ssl 2> >(grep -v "InsecureRequestWarning" >&2)
}

# Verify authentication
echo "Checking AWS authentication..."
if ! aws_cmd sts get-caller-identity --query 'Account' --output text > /dev/null 2>&1; then
    echo "ERROR: AWS CLI not authenticated"
    echo "  Please run: export AWS_PROFILE=saml"
    echo "  Then re-authenticate via Okta/SAML"
    exit 1
fi
echo "AWS CLI authenticated"
echo ""

# Load .env
if [ ! -f .env ]; then
    echo "ERROR: .env file not found. Create .env with CONNECTION_ARN, JWT_CLIENT_ID, JWT_SECRET, USER_CLIENT_ID"
    exit 1
fi
set -a
source .env
set +a

if [ -z "$CONNECTION_ARN" ]; then
    echo "ERROR: CONNECTION_ARN must be set in .env (App Runner GitHub connection ARN)"
    echo "  Example: CONNECTION_ARN=arn:aws:apprunner:us-west-2:ACCOUNT_ID:connection/NAME/ID"
    exit 1
fi
if [ -z "$JWT_CLIENT_ID" ] || [ -z "$JWT_SECRET" ]; then
    echo "ERROR: JWT_CLIENT_ID and JWT_SECRET must be set in .env"
    exit 1
fi

# Check connection status (use list-connections; describe-connection may not exist in older CLI)
echo "Checking GitHub connection status..."
CONN_STATUS=$(aws_cmd apprunner list-connections \
    --region "$REGION" \
    --query "ConnectionSummaryList[?ConnectionName=='ccc-github-connection'].Status | [0]" \
    --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$CONN_STATUS" != "AVAILABLE" ]; then
    echo "ERROR: GitHub connection is not AVAILABLE (status: $CONN_STATUS)"
    echo ""
    echo "Complete Step 2 - GitHub Authorization:"
    echo "  1. Go to AWS Console -> App Runner -> Connections"
    echo "  2. Find ccc-github-connection, click Connect/Complete setup"
    echo "  3. Authorize AWS Connector for GitHub and grant access to ja2z/ccc"
    echo "  4. Wait for status AVAILABLE, then re-run this script"
    exit 1
fi
echo "GitHub connection OK"
echo ""

export CONNECTION_ARN
# Build service config JSON (use Python for proper escaping of env var values)
CONFIG=$(python3 -c "
import json, os
conn_arn = os.environ.get('CONNECTION_ARN')
jwt_cid = os.environ.get('JWT_CLIENT_ID', '')
jwt_sec = os.environ.get('JWT_SECRET', '')
user_cid = os.environ.get('USER_CLIENT_ID', \"'dnkn'\")
config = {
    'ServiceName': 'commerce-control-center',
    'SourceConfiguration': {
        'AuthenticationConfiguration': {'ConnectionArn': conn_arn},
        'AutoDeploymentsEnabled': True,
        'CodeRepository': {
            'RepositoryUrl': 'https://github.com/ja2z/ccc',
            'SourceCodeVersion': {'Type': 'BRANCH', 'Value': 'main'},
            'CodeConfiguration': {
                'ConfigurationSource': 'API',
                'CodeConfigurationValues': {
                    'Runtime': 'NODEJS_22',
                    'BuildCommand': 'npm install && npm run build',
                    'StartCommand': 'npm start',
                    'Port': '8080',
                    'RuntimeEnvironmentVariables': {
                        'PORT': '8080',
                        'JWT_CLIENT_ID': jwt_cid,
                        'JWT_SECRET': jwt_sec,
                        'USER_CLIENT_ID': user_cid,
                    },
                },
            },
        },
    },
}
print(json.dumps(config))
" 2>/dev/null)

# Check if service already exists
EXISTING_ARN=$(aws_cmd apprunner list-services --region "$REGION" --query "ServiceSummaryList[?ServiceName=='$SERVICE_NAME'].ServiceArn" --output text 2>/dev/null || true)

if [ -n "$EXISTING_ARN" ]; then
    echo "Service exists. Starting update..."
    UPDATE_CONFIG=$(EXISTING_ARN="$EXISTING_ARN" python3 -c "
import os, json, sys
d = json.load(sys.stdin)
print(json.dumps({
    'ServiceArn': os.environ['EXISTING_ARN'],
    'SourceConfiguration': d['SourceConfiguration']
}))
" <<< "$CONFIG")
    aws_cmd apprunner update-service \
        --region "$REGION" \
        --cli-input-json "$UPDATE_CONFIG" \
        --output json > /dev/null
    echo "Update initiated. Waiting for deployment..."
    SERVICE_ARN="$EXISTING_ARN"
else
    echo "Creating App Runner service..."
    RESULT=$(aws_cmd apprunner create-service \
        --region "$REGION" \
        --cli-input-json "$CONFIG" \
        --output json)
    SERVICE_ARN=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['Service']['ServiceArn'])")
    echo "Service creation initiated. Waiting for deployment..."
fi

# Poll until RUNNING
echo "Waiting for deployment (typically 5-10 min). Check progress: ./scripts/check-apprunner-status.sh"
echo ""
while true; do
    STATUS=$(aws_cmd apprunner describe-service --service-arn "$SERVICE_ARN" --region "$REGION" --query 'Service.Status' --output text)
    OP_STATUS=$(aws_cmd apprunner list-operations --service-arn "$SERVICE_ARN" --region "$REGION" --query 'OperationSummaryList[0].Status' --output text 2>/dev/null || echo "?")
    echo "$(date +%H:%M:%S) Service: $STATUS  |  Latest operation: $OP_STATUS"
    if [ "$STATUS" = "RUNNING" ]; then
        break
    fi
    if [ "$STATUS" = "CREATE_FAILED" ]; then
        echo ""
        echo "ERROR: Service creation failed. Run ./scripts/check-apprunner-status.sh or check AWS Console."
        exit 1
    fi
    sleep 15
done

SERVICE_URL=$(aws_cmd apprunner describe-service --service-arn "$SERVICE_ARN" --region "$REGION" --query 'Service.ServiceUrl' --output text)
echo ""
echo "Deployment complete."
echo "Service URL: https://$SERVICE_URL"
