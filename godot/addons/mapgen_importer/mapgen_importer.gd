@tool
extends EditorPlugin

var _dock: VBoxContainer
var _layout_path: LineEdit
var _output_path: LineEdit
var _overwrite: CheckBox
var _status: RichTextLabel
var _file_dialog: FileDialog
var _baker := MapgenBaker.new()


func _enter_tree() -> void:
	_build_dock()
	add_control_to_dock(DOCK_SLOT_RIGHT_UL, _dock)


func _exit_tree() -> void:
	if is_instance_valid(_dock):
		remove_control_from_docks(_dock)
		_dock.queue_free()


func _build_dock() -> void:
	_dock = VBoxContainer.new()
	_dock.name = "Mapgen Baker"
	_dock.custom_minimum_size = Vector2(300, 0)

	var title := Label.new()
	title.text = "MAPGEN / FIXED BAKE"
	title.add_theme_font_size_override("font_size", 18)
	_dock.add_child(title)

	var description := Label.new()
	description.text = "Select a paired *.layout.json file. The plugin validates the adjacent GLB, creates native collision and saves an editable scene."
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_dock.add_child(description)

	_dock.add_child(HSeparator.new())
	_layout_path = _add_path_row("Layout JSON", "*.layout.json")
	_output_path = _add_path_row("Output scene", "*.tscn", FileDialog.FILE_MODE_SAVE_FILE)
	_overwrite = CheckBox.new()
	_overwrite.text = "Allow overwrite of the output scene"
	_dock.add_child(_overwrite)

	var bake_button := Button.new()
	bake_button.text = "Bake GLB + JSON to .tscn"
	bake_button.pressed.connect(_on_bake_pressed)
	_dock.add_child(bake_button)

	_status = RichTextLabel.new()
	_status.fit_content = true
	_status.custom_minimum_size.y = 100
	_status.bbcode_enabled = true
	_status.text = "[color=#999999]Waiting for a Mapgen export pair.[/color]"
	_dock.add_child(_status)

	_file_dialog = FileDialog.new()
	_file_dialog.access = FileDialog.ACCESS_FILESYSTEM
	_file_dialog.use_native_dialog = true
	_dock.add_child(_file_dialog)


func _add_path_row(label_text: String, filter: String, mode := FileDialog.FILE_MODE_OPEN_FILE) -> LineEdit:
	var label := Label.new()
	label.text = label_text
	_dock.add_child(label)
	var row := HBoxContainer.new()
	_dock.add_child(row)
	var line_edit := LineEdit.new()
	line_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(line_edit)
	var browse := Button.new()
	browse.text = "Browse…"
	row.add_child(browse)
	browse.pressed.connect(func() -> void:
		_file_dialog.file_mode = mode
		_file_dialog.filters = PackedStringArray([filter])
		var callbacks := _file_dialog.file_selected.get_connections()
		for callback in callbacks:
			_file_dialog.file_selected.disconnect(callback.callable)
		_file_dialog.file_selected.connect(func(path: String) -> void: line_edit.text = path, CONNECT_ONE_SHOT)
		_file_dialog.popup_centered_ratio(0.7)
	)
	return line_edit


func _on_bake_pressed() -> void:
	var layout_path := _layout_path.text.strip_edges()
	if layout_path.is_empty():
		_set_error("Choose a *.layout.json file first.")
		return
	var result := _baker.bake(layout_path, _output_path.text.strip_edges(), _overwrite.button_pressed)
	if not result.ok:
		_set_error(String(result.error))
		return
	_output_path.text = result.scene_path
	_status.text = "[color=#9fc27c]Bake complete[/color]\n%s" % result.scene_path
	EditorInterface.get_resource_filesystem().scan()


func _set_error(message: String) -> void:
	_status.text = "[color=#e06b55]Bake failed[/color]\n%s" % message
