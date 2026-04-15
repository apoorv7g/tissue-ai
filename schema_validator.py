def validate_flowchart(data: dict) -> tuple[bool, str | None]:
    if not isinstance(data, dict):
        return False, "Root must be a JSON object."

    if "nodes" not in data or "edges" not in data:
        return False, "Flowchart must contain 'nodes' and 'edges' arrays."

    if not isinstance(data["nodes"], list) or not isinstance(data["edges"], list):
        return False, "'nodes' and 'edges' must be arrays."

    node_ids = set()
    for i, node in enumerate(data["nodes"]):
        if not isinstance(node, dict):
            return False, f"Node at index {i} is not an object."
        if "id" not in node or "label" not in node:
            return False, f"Node at index {i} missing 'id' or 'label'."
        node_ids.add(node["id"])

    for i, edge in enumerate(data["edges"]):
        if not isinstance(edge, dict):
            return False, f"Edge at index {i} is not an object."
        if "from" not in edge or "to" not in edge:
            return False, f"Edge at index {i} missing 'from' or 'to'."
        if edge["from"] not in node_ids:
            return False, f"Edge at index {i} references unknown source node '{edge['from']}'."
        if edge["to"] not in node_ids:
            return False, f"Edge at index {i} references unknown target node '{edge['to']}'."

    return True, None


def validate_mindmap(data: dict) -> tuple[bool, str | None]:
    if not isinstance(data, dict):
        return False, "Root must be a JSON object."

    if "root" not in data:
        return False, "Mind map must contain a 'root' object."

    def validate_node(node, path="root"):
        if not isinstance(node, dict):
            return False, f"{path} is not an object."
        if "id" not in node or "label" not in node:
            return False, f"{path} missing 'id' or 'label'."
        children = node.get("children", [])
        if not isinstance(children, list):
            return False, f"{path}.children must be an array."
        for i, child in enumerate(children):
            ok, err = validate_node(child, f"{path}.children[{i}]")
            if not ok:
                return False, err
        return True, None

    return validate_node(data["root"])


def validate_diagram_schema(data: dict, diagram_type: str) -> tuple[bool, str | None]:
    if diagram_type == "flowchart":
        return validate_flowchart(data)
    elif diagram_type == "mindmap":
        return validate_mindmap(data)
    elif diagram_type == "er":
        return validate_er(data)
    elif diagram_type == "venn":
        return validate_venn(data)
    return False, f"Unknown diagram type: {diagram_type}"


def validate_er(data: dict) -> tuple[bool, str | None]:
    if not isinstance(data, dict):
        return False, "Root must be a JSON object."

    if "entities" not in data or "relationships" not in data:
        return False, "ER diagram must contain 'entities' and 'relationships' arrays."

    if not isinstance(data["entities"], list) or not isinstance(data["relationships"], list):
        return False, "'entities' and 'relationships' must be arrays."

    entity_ids = set()
    for i, entity in enumerate(data["entities"]):
        if not isinstance(entity, dict):
            return False, f"Entity at index {i} is not an object."
        if "id" not in entity or "name" not in entity:
            return False, f"Entity at index {i} missing 'id' or 'name'."
        entity_ids.add(entity["id"])

    for i, rel in enumerate(data["relationships"]):
        if not isinstance(rel, dict):
            return False, f"Relationship at index {i} is not an object."
        if "id" not in rel or "name" not in rel or "entity1" not in rel or "entity2" not in rel:
            return False, f"Relationship at index {i} missing required fields."
        if rel["entity1"] not in entity_ids:
            return False, f"Relationship at index {i} references unknown entity '{rel['entity1']}'."
        if rel["entity2"] not in entity_ids:
            return False, f"Relationship at index {i} references unknown entity '{rel['entity2']}'."

    return True, None


def validate_venn(data: dict) -> tuple[bool, str | None]:
    if not isinstance(data, dict):
        return False, "Root must be a JSON object."

    if "sets" not in data or "regions" not in data:
        return False, "Venn diagram must contain 'sets' and 'regions' arrays."

    if not isinstance(data["sets"], list) or not isinstance(data["regions"], list):
        return False, "'sets' and 'regions' must be arrays."

    set_ids = set()
    for i, s in enumerate(data["sets"]):
        if not isinstance(s, dict):
            return False, f"Set at index {i} is not an object."
        if "id" not in s or "label" not in s:
            return False, f"Set at index {i} missing 'id' or 'label'."
        set_ids.add(s["id"])

    for i, region in enumerate(data["regions"]):
        if not isinstance(region, dict):
            return False, f"Region at index {i} is not an object."
        if "id" not in region or "label" not in region or "setIds" not in region:
            return False, f"Region at index {i} missing required fields."
        if not isinstance(region["setIds"], list):
            return False, f"Region at index {i} 'setIds' must be an array."
        for set_id in region["setIds"]:
            if set_id not in set_ids:
                return False, f"Region at index {i} references unknown set '{set_id}'."

    return True, None