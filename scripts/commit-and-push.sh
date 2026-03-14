#!/bin/bash

# Quick commit and push script
cd ~/Documents/Github/eatier

echo "📝 Adding all changes..."
git add .

echo "💾 Committing..."
git commit -m "Fix AccountActivity property names in Accounts Centre template"

echo "🚀 Pushing to development-v2..."
git push origin development-v2

echo "✅ Done!"

