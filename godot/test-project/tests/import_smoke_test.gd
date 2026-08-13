extends SceneTree

const Baker = preload("res://addons/mapgen_importer/mapgen_baker.gd")
const DEFAULT_LAYOUT := "res://test-project/fixtures/dungeon-minimum-00019919-160x160.layout.json"
var _failed := false


func _init() -> void:
	var baker = Baker.new()
	var inspected: Dictionary = baker.inspect_pair(DEFAULT_LAYOUT)
	_assert(inspected.ok, "Pair inspection failed: %s" % inspected.get("error", "unknown"))
	_assert(inspected.layout.schemaVersion == 1, "Unexpected schema version")

	var built: Dictionary = baker.build_scene(DEFAULT_LAYOUT)
	_assert(built.ok, "Scene build failed: %s" % built.get("error", "unknown"))
	var root: Node = built.root
	_assert(root.name == "DungeonRoot", "Unexpected root name")
	_assert(root.get_node_or_null("VisualModel") != null, "VisualModel is missing")
	_assert(root.get_node_or_null("Collision/StaticBody3D") != null, "StaticBody3D is missing")
	_assert(root.get_node("Collision/StaticBody3D").get_child_count() == built.layout.colliders.size(), "Collider count mismatch")
	_assert(root.get_node_or_null("PlayerSpawn") is Marker3D, "PlayerSpawn is missing")
	_assert(root.get_node_or_null("DungeonMetadata") != null, "DungeonMetadata is missing")
	root.free()

	var output := "user://mapgen-smoke-dungeon.tscn"
	var baked: Dictionary = baker.bake(DEFAULT_LAYOUT, output, true)
	_assert(baked.ok, "Bake failed: %s" % baked.get("error", "unknown"))
	var refused_overwrite: Dictionary = baker.bake(DEFAULT_LAYOUT, output, false)
	_assert(not refused_overwrite.ok, "Existing scene should not be overwritten without permission")
	_assert("already exists" in String(refused_overwrite.error), "Unexpected overwrite refusal message")
	var packed := ResourceLoader.load(output, "PackedScene", ResourceLoader.CACHE_MODE_IGNORE) as PackedScene
	_assert(packed != null and packed.can_instantiate(), "Saved PackedScene cannot instantiate")
	var instance := packed.instantiate()
	_assert(instance.get_node_or_null("PlayerSpawn") != null, "Saved scene lost PlayerSpawn")
	instance.free()
	_test_hash_mismatch_is_rejected(baker)

	print("MAPGEN_GODOT_SMOKE_OK colliders=%d scene=%s" % [built.layout.colliders.size(), output])
	quit(1 if _failed else 0)


func _test_hash_mismatch_is_rejected(baker) -> void:
	var original_file := FileAccess.open(DEFAULT_LAYOUT, FileAccess.READ)
	_assert(original_file != null, "Could not read fixture layout")
	var layout = JSON.parse_string(original_file.get_as_text())
	original_file.close()
	layout.glbSha256 = "0".repeat(64)
	var mismatch_layout := "user://hash-mismatch.layout.json"
	var mismatch_glb := "user://hash-mismatch.glb"
	var layout_file := FileAccess.open(mismatch_layout, FileAccess.WRITE)
	_assert(layout_file != null, "Could not write mismatch layout")
	layout_file.store_string(JSON.stringify(layout))
	layout_file.close()
	var source_glb := DEFAULT_LAYOUT.trim_suffix(".layout.json") + ".glb"
	var glb_file := FileAccess.open(mismatch_glb, FileAccess.WRITE)
	_assert(glb_file != null, "Could not write mismatch GLB")
	glb_file.store_buffer(FileAccess.get_file_as_bytes(source_glb))
	glb_file.close()
	var mismatched: Dictionary = baker.inspect_pair(mismatch_layout)
	_assert(not mismatched.ok, "Mismatched GLB digest should be rejected")
	_assert("SHA-256" in String(mismatched.error), "Unexpected hash mismatch message")


func _assert(condition: bool, message: String) -> void:
	if condition:
		return
	_failed = true
	push_error(message)
