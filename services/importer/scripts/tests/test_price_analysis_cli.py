#!/usr/bin/env python3
"""
CLI Test Script for Price Analysis Pipeline
============================================

Usage:
    python test_price_analysis_cli.py --project-id <PROJECT_ID> [options]

Options:
    --project-id    Project ID to analyze (required)
    --top-k         Number of neighbors to consider (default: 30)
    --min-sim       Minimum similarity threshold (default: 0.55)
    --mad           MAD threshold for outlier detection (default: 2.0)
    --wbs6          Filter to specific WBS6 code (optional)
    --limit         Limit output lines (default: 20)
"""

import argparse
import os
import sys

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analytics.price_analysis import PriceAnalyzer, AnalysisParams


def format_currency(value: float) -> str:
    """Format value as currency."""
    return f"€{value:,.2f}"


def format_percent(value: float) -> str:
    """Format value as percentage."""
    if value is None:
        return "N/A"
    sign = "+" if value > 0 else ""
    return f"{sign}{value * 100:.1f}%"


def main():
    parser = argparse.ArgumentParser(description="Test Price Analysis Pipeline")
    parser.add_argument("--project-id", required=True, help="Project ID to analyze")
    parser.add_argument("--top-k", type=int, default=30, help="Number of neighbors")
    parser.add_argument("--min-sim", type=float, default=0.55, help="Min similarity threshold")
    parser.add_argument("--mad", type=float, default=2.0, help="MAD threshold for outliers")
    parser.add_argument("--wbs6", type=str, default=None, help="Filter to specific WBS6 code")
    parser.add_argument("--limit", type=int, default=20, help="Limit output lines")
    parser.add_argument("--show-all", action="store_true", help="Show all items, not just outliers")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Price Analysis Pipeline - Test Run")
    print("=" * 60)
    print(f"Project ID: {args.project_id}")
    print(f"Parameters: top_k={args.top_k}, min_sim={args.min_sim}, mad={args.mad}")
    if args.wbs6:
        print(f"Filtering to WBS6: {args.wbs6}")
    print("-" * 60)
    
    # Run analysis
    params = AnalysisParams(
        top_k=args.top_k,
        min_similarity=args.min_sim,
        mad_threshold=args.mad,
        wbs6_filter=args.wbs6,
        include_neighbors=True
    )
    
    analyzer = PriceAnalyzer()
    
    try:
        result = analyzer.analyze_project(args.project_id, params)
    finally:
        analyzer.close()
    
    # Summary
    print("\n📊 SUMMARY")
    print("-" * 40)
    print(f"Total items with embeddings: {result.total_items}")
    print(f"Categories analyzed: {result.categories_analyzed}")
    print(f"Outliers found: {result.outliers_found}")
    
    if result.total_items > 0 and result.outliers_found > 0:
        pct = result.outliers_found / result.total_items * 100
        print(f"Outlier rate: {pct:.1f}%")
    
    # Categories
    print("\n📁 CATEGORIES")
    print("-" * 40)
    
    for cat in result.categories:
        outlier_indicator = "⚠️ " if cat.outlier_count > 0 else "   "
        print(f"{outlier_indicator}{cat.wbs6_code}: {cat.wbs6_description[:40]} ({cat.item_count} items, {cat.outlier_count} outliers)")
        
        if cat.stats:
            print(f"      Stats: mean={format_currency(cat.stats.mean)}, "
                  f"median={format_currency(cat.stats.median)}, "
                  f"MAD={format_currency(cat.stats.mad)}")
    
    # Outliers
    print("\n🚨 OUTLIERS")
    print("-" * 40)
    
    outlier_count = 0
    for cat in result.categories:
        for item in cat.items:
            if item.is_outlier:
                outlier_count += 1
                if outlier_count > args.limit:
                    print(f"... and {result.outliers_found - args.limit} more")
                    break
                
                severity_icon = {"high": "🔴", "medium": "🟠", "low": "🟡"}.get(item.outlier_severity, "⚪")
                print(f"\n{severity_icon} [{cat.wbs6_code}] {item.code}")
                print(f"   {item.description[:60]}...")
                print(f"   Actual: {format_currency(item.actual_price)} | Estimated: {format_currency(item.estimated_price or 0)}")
                print(f"   Delta: {format_percent(item.delta)} | Neighbors: {item.neighbors_count} (avg sim: {item.avg_similarity:.2f})")
                print(f"   Reason: {item.outlier_reason}")
        
        if outlier_count > args.limit:
            break
    
    if outlier_count == 0:
        print("No outliers found! 🎉")
    
    # Show sample items if requested
    if args.show_all:
        print("\n📋 ALL ITEMS (sample)")
        print("-" * 40)
        
        shown = 0
        for cat in result.categories:
            for item in cat.items:
                if shown >= args.limit:
                    break
                
                status = "⚠️" if item.is_outlier else "✅"
                print(f"{status} {item.code}: {format_currency(item.actual_price)} → est. {format_currency(item.estimated_price or 0)} ({format_percent(item.delta)})")
                shown += 1
            
            if shown >= args.limit:
                print(f"... showing first {args.limit} items only")
                break
    
    print("\n" + "=" * 60)
    print("Analysis complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()

