"""Recipe CRUD endpoints.

Recipes are cleaning/transformation rules attached to a source.
They're applied automatically on each scan.
"""

import logging
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.db import queries

logger = logging.getLogger(__name__)
router = APIRouter(tags=["recipes"])

# Valid recipe operations
VALID_OPERATIONS = {
    "rename_column",
    "drop_column",
    "fill_null",
    "cast_type",
    "strip_whitespace",
    "lowercase",
    "uppercase",
    "replace_value",
    "regex_replace",
    "deduplicate",
    "filter_rows",
    "sort_by",
    "reorder_columns",
}


@router.get("/api/v1/sources/{source_id}/recipes")
async def list_recipes(request: Request, source_id: str):
    """Get all recipes for a source, ordered by order_index."""
    session_id = request.state.session_id

    # Verify source exists
    source = queries.get_source(source_id, session_id)
    if not source:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Source not found",
                "code": "source_not_found",
            },
        )

    try:
        recipes = queries.get_recipes(source_id, session_id)
        return {"data": recipes, "total": len(recipes)}
    except Exception as e:
        logger.error(f"Failed to list recipes for source {source_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to retrieve recipes",
                "code": "list_recipes_error",
            },
        )


@router.post("/api/v1/sources/{source_id}/recipes")
async def create_recipe(request: Request, source_id: str):
    """Create a new recipe for a source."""
    session_id = request.state.session_id

    # Verify source exists
    source = queries.get_source(source_id, session_id)
    if not source:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Source not found",
                "code": "source_not_found",
            },
        )

    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid JSON body",
                "code": "invalid_json",
            },
        )

    # Validate required fields
    operation = body.get("operation", "").strip()
    if not operation:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Operation is required",
                "code": "missing_operation",
            },
        )

    if operation not in VALID_OPERATIONS:
        return JSONResponse(
            status_code=400,
            content={
                "error": f"Invalid operation: '{operation}'. Valid: {', '.join(sorted(VALID_OPERATIONS))}",
                "code": "invalid_operation",
            },
        )

    # Build recipe data
    recipe_data = {
        "operation": operation,
        "column_name": body.get("column_name"),
        "params": body.get("params"),
        "description": body.get("description", ""),
        "enabled": body.get("enabled", True),
        "order_index": body.get("order_index", 0),
    }

    try:
        recipe = queries.create_recipe(source_id, session_id, recipe_data)
        return JSONResponse(status_code=201, content=recipe)
    except Exception as e:
        logger.error(f"Failed to create recipe: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to create recipe",
                "code": "create_recipe_error",
            },
        )


@router.put("/api/v1/sources/{source_id}/recipes/{recipe_id}")
async def update_recipe(request: Request, source_id: str, recipe_id: str):
    """Update an existing recipe."""
    session_id = request.state.session_id

    # Verify source exists
    source = queries.get_source(source_id, session_id)
    if not source:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Source not found",
                "code": "source_not_found",
            },
        )

    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid JSON body",
                "code": "invalid_json",
            },
        )

    # Validate operation if provided
    if "operation" in body:
        operation = body["operation"].strip()
        if operation not in VALID_OPERATIONS:
            return JSONResponse(
                status_code=400,
                content={
                    "error": f"Invalid operation: '{operation}'. Valid: {', '.join(sorted(VALID_OPERATIONS))}",
                    "code": "invalid_operation",
                },
            )

    try:
        updated = queries.update_recipe(recipe_id, source_id, session_id, body)
        if not updated:
            return JSONResponse(
                status_code=404,
                content={
                    "error": "Recipe not found",
                    "code": "recipe_not_found",
                },
            )
        return updated
    except Exception as e:
        logger.error(f"Failed to update recipe {recipe_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to update recipe",
                "code": "update_recipe_error",
            },
        )


@router.delete("/api/v1/sources/{source_id}/recipes/{recipe_id}")
async def delete_recipe(request: Request, source_id: str, recipe_id: str):
    """Delete a recipe."""
    session_id = request.state.session_id

    # Verify source exists
    source = queries.get_source(source_id, session_id)
    if not source:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Source not found",
                "code": "source_not_found",
            },
        )

    try:
        deleted = queries.delete_recipe(recipe_id, source_id, session_id)
        if not deleted:
            return JSONResponse(
                status_code=404,
                content={
                    "error": "Recipe not found",
                    "code": "recipe_not_found",
                },
            )
        return JSONResponse(status_code=204, content=None)
    except Exception as e:
        logger.error(f"Failed to delete recipe {recipe_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to delete recipe",
                "code": "delete_recipe_error",
            },
        )


@router.put("/api/v1/sources/{source_id}/recipes/reorder")
async def reorder_recipes(request: Request, source_id: str):
    """Reorder recipes by providing an ordered list of recipe IDs.

    Expects body: { "recipe_ids": ["id1", "id2", "id3"] }
    The order_index of each recipe is set to its position in the list.
    """
    session_id = request.state.session_id

    # Verify source exists
    source = queries.get_source(source_id, session_id)
    if not source:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Source not found",
                "code": "source_not_found",
            },
        )

    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid JSON body",
                "code": "invalid_json",
            },
        )

    recipe_ids = body.get("recipe_ids", [])
    if not isinstance(recipe_ids, list) or not recipe_ids:
        return JSONResponse(
            status_code=400,
            content={
                "error": "recipe_ids must be a non-empty array of recipe IDs",
                "code": "invalid_recipe_ids",
            },
        )

    try:
        reordered = queries.reorder_recipes(source_id, session_id, recipe_ids)
        return {"data": reordered, "total": len(reordered)}
    except Exception as e:
        logger.error(f"Failed to reorder recipes for source {source_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to reorder recipes",
                "code": "reorder_recipes_error",
            },
        )
