@tool
class_name MapgenBaker
extends RefCounted

const SCHEMA_VERSION := 1
const MAX_LAYOUT_BYTES := 16 * 1024 * 1024
const MAX_COLLIDERS := 100_000
const LAYOUT_SUFFIX := ".layout.json"


func inspect_pair(layout_path: String) -> Dictionary:
	var loaded := _load_and_validate_layout(layout_path)
	if not loaded.ok:
		return loaded
	var glb_path := _paired_glb_path(layout_path)
	if not FileAccess.file_exists(glb_path):
		return _failure("Paired GLB does not exist: %s" % glb_path)
	var actual_hash := FileAccess.get_sha256(glb_path)
	if actual_hash.is_empty():
		return _failure("Could not calculate GLB SHA-256: %s" % glb_path)
	if actual_hash.to_lower() != String(loaded.layout.glbSha256).to_lower():
		return _failure("GLB SHA-256 does not match layout JSON")
	return {
		"ok": true,
		"layout": loaded.layout,
		"glb_path": glb_path,
		"glb_sha256": actual_hash,
	}


func build_scene(layout_path: String) -> Dictionary:
	var inspected := inspect_pair(layout_path)
	if not inspected.ok:
		return inspected

	var gltf_state := GLTFState.new()
	var gltf_document := GLTFDocument.new()
	var import_error := gltf_document.append_from_file(inspected.glb_path, gltf_state)
	if import_error != OK:
		return _failure("Godot could not read GLB (error %d)" % import_error)
	var imported_scene := gltf_document.generate_scene(gltf_state)
	if imported_scene == null:
		return _failure("Godot could not generate a scene from the GLB")

	var root := Node3D.new()
	root.name = "DungeonRoot"
	imported_scene.name = "VisualModel"
	root.add_child(imported_scene)

	var collision_root := Node3D.new()
	collision_root.name = "Collision"
	root.add_child(collision_root)
	var static_body := StaticBody3D.new()
	static_body.name = "StaticBody3D"
	collision_root.add_child(static_body)

	for collider in inspected.layout.colliders:
		var collision_shape := CollisionShape3D.new()
		collision_shape.name = _safe_node_name(String(collider.id))
		var box := BoxShape3D.new()
		box.size = _array_to_vector3(collider.size)
		collision_shape.shape = box
		collision_shape.position = _array_to_vector3(collider.center)
		collision_shape.rotation.y = float(collider.get("rotationY", 0.0))
		collision_shape.set_meta("mapgen_id", String(collider.id))
		collision_shape.set_meta("mapgen_kind", String(collider.kind))
		static_body.add_child(collision_shape)

	var spawn := Marker3D.new()
	spawn.name = "PlayerSpawn"
	spawn.position = _array_to_vector3(inspected.layout.spawn.position)
	spawn.rotation.y = float(inspected.layout.spawn.rotationY)
	root.add_child(spawn)

	var metadata := Node.new()
	metadata.name = "DungeonMetadata"
	metadata.set_meta("schema_version", int(inspected.layout.schemaVersion))
	metadata.set_meta("generator_version", String(inspected.layout.generatorVersion))
	metadata.set_meta("export_id", String(inspected.layout.exportId))
	metadata.set_meta("seed", int(inspected.layout.seed))
	metadata.set_meta("glb_sha256", String(inspected.layout.glbSha256))
	metadata.set_meta("parameters", inspected.layout.parameters.duplicate(true))
	root.add_child(metadata)

	_assign_owner_recursive(root, root)
	return {
		"ok": true,
		"root": root,
		"layout": inspected.layout,
		"glb_path": inspected.glb_path,
	}


func bake(layout_path: String, output_path := "", overwrite := false) -> Dictionary:
	var built := build_scene(layout_path)
	if not built.ok:
		return built
	var resolved_output := output_path
	if resolved_output.is_empty():
		resolved_output = layout_path.trim_suffix(LAYOUT_SUFFIX) + ".tscn"
	if not resolved_output.ends_with(".tscn"):
		built.root.free()
		return _failure("Output path must end with .tscn")
	if FileAccess.file_exists(resolved_output) and not overwrite:
		built.root.free()
		return _failure("Output scene already exists; enable overwrite or choose another path")

	var packed := PackedScene.new()
	var pack_error := packed.pack(built.root)
	if pack_error != OK:
		built.root.free()
		return _failure("Could not pack scene (error %d)" % pack_error)
	var save_error := ResourceSaver.save(packed, resolved_output)
	built.root.free()
	if save_error != OK:
		return _failure("Could not save scene (error %d)" % save_error)
	return {
		"ok": true,
		"scene_path": resolved_output,
		"layout": built.layout,
		"glb_path": built.glb_path,
	}


func _load_and_validate_layout(layout_path: String) -> Dictionary:
	if not layout_path.ends_with(LAYOUT_SUFFIX):
		return _failure("Layout path must end with %s" % LAYOUT_SUFFIX)
	if not FileAccess.file_exists(layout_path):
		return _failure("Layout JSON does not exist: %s" % layout_path)
	var file_size := FileAccess.get_size(layout_path)
	if file_size <= 0 or file_size > MAX_LAYOUT_BYTES:
		return _failure("Layout JSON size is outside the allowed range")
	var file := FileAccess.open(layout_path, FileAccess.READ)
	if file == null:
		return _failure("Could not open layout JSON")
	var parser := JSON.new()
	var parse_error := parser.parse(file.get_as_text())
	if parse_error != OK:
		return _failure("Invalid JSON at line %d: %s" % [parser.get_error_line(), parser.get_error_message()])
	var layout = parser.data
	if typeof(layout) != TYPE_DICTIONARY:
		return _failure("Layout JSON root must be an object")
	var validation_error := _validate_layout(layout)
	if not validation_error.is_empty():
		return _failure(validation_error)
	return {"ok": true, "layout": layout}


func _validate_layout(layout: Dictionary) -> String:
	var required := [
		"schemaVersion", "generatorVersion", "exportId", "glbSha256", "seed",
		"parameters", "coordinateSystem", "assetPack", "colliders", "spawn"
	]
	for key in required:
		if not layout.has(key):
			return "Layout JSON is missing required field: %s" % key
	if int(layout.schemaVersion) != SCHEMA_VERSION:
		return "Unsupported schemaVersion: %s" % layout.schemaVersion
	if String(layout.exportId).is_empty() or String(layout.generatorVersion).is_empty():
		return "exportId and generatorVersion must not be empty"
	if not _is_sha256(String(layout.glbSha256)):
		return "glbSha256 must be a 64-character hexadecimal string"
	if typeof(layout.colliders) != TYPE_ARRAY or layout.colliders.size() > MAX_COLLIDERS:
		return "colliders must be an array within the safety limit"
	for collider in layout.colliders:
		if typeof(collider) != TYPE_DICTIONARY:
			return "Every collider must be an object"
		for key in ["id", "kind", "center", "size"]:
			if not collider.has(key):
				return "Collider is missing required field: %s" % key
		if not _is_vector3_array(collider.center, false):
			return "Collider center must contain three finite numbers"
		if not _is_vector3_array(collider.size, true):
			return "Collider size must contain three positive finite numbers"
	if typeof(layout.spawn) != TYPE_DICTIONARY or not layout.spawn.has("position") or not layout.spawn.has("rotationY"):
		return "spawn is invalid"
	if not _is_vector3_array(layout.spawn.position, false) or not is_finite(float(layout.spawn.rotationY)):
		return "spawn position or rotation is invalid"
	if typeof(layout.coordinateSystem) != TYPE_DICTIONARY:
		return "coordinateSystem is invalid"
	if layout.coordinateSystem.get("up") != "Y" or layout.coordinateSystem.get("forward") != "-Z" or layout.coordinateSystem.get("handedness") != "right":
		return "Only right-handed Y-up / -Z-forward layouts are supported"
	return ""


func _paired_glb_path(layout_path: String) -> String:
	return layout_path.trim_suffix(LAYOUT_SUFFIX) + ".glb"


func _is_sha256(value: String) -> bool:
	if value.length() != 64:
		return false
	for character in value.to_lower():
		if not character in "0123456789abcdef":
			return false
	return true


func _is_vector3_array(value, require_positive: bool) -> bool:
	if typeof(value) != TYPE_ARRAY or value.size() != 3:
		return false
	for component in value:
		if typeof(component) != TYPE_FLOAT and typeof(component) != TYPE_INT:
			return false
		var number := float(component)
		if not is_finite(number) or (require_positive and number <= 0.0):
			return false
	return true


func _array_to_vector3(value: Array) -> Vector3:
	return Vector3(float(value[0]), float(value[1]), float(value[2]))


func _safe_node_name(value: String) -> String:
	var safe := value.validate_node_name()
	return safe if not safe.is_empty() else "Collider"


func _assign_owner_recursive(node: Node, root: Node) -> void:
	for child in node.get_children():
		child.owner = root
		_assign_owner_recursive(child, root)


func _failure(message: String) -> Dictionary:
	return {"ok": false, "error": message}
