#pragma once
# include<string>
# include<Windows.h>
# include<iostream>
#pragma execution_character_set("utf-8")

namespace pmx {
	enum struct index_type { VERTEX, TEXTURE, MATERIAL, BONE, MORPH, RIGID };
	enum struct weight_type { BDEF1, BDEF2, BDEF4, SDEF };
	enum struct toon_flag_type { TEXTURE, INBUILT };

	enum bone_flag_type : uint16_t {
		CONNECTION                = (1 << 0),
		ROTATABLE                 = (1 << 1),
		MOVABLE                   = (1 << 2),
		DISPLAY                   = (1 << 3),
		CAN_OPERATE               = (1 << 4),
		INV_KINEMATICS            = (1 << 5),
		UNUSED                    = (1 << 6),
		ADD_LOCAL_DEFORM          = (1 << 7),
		ADD_ROTATION              = (1 << 8),
		ADD_MOVEMENT              = (1 << 9),
		FIXED_AXIS                = (1 << 10),
		LOCAL_AXIS                = (1 << 11),
		PHYSICAL_TRANSFORM        = (1 << 12),
		EXTERNAL_PARENT_TRANSFORM = (1 << 13)
	};

	std::ostream* out = &std::cout;

	struct text;
	struct vec2 { float x, y; };
	struct vec3 { float x, y, z; };
	struct vec4 { float x, y, z, w; };

	struct header_t;
	struct info_t;
	struct index_size_t;
	struct model_info_t;
	struct vertex_t;
	struct vertex_list;
	union  weight_t;
	struct index_t;
	struct face_t;
	struct face_list;
	struct texture_t;
	struct texture_list;
	struct material_t;
	struct material_list;
	struct bone_t;
	struct link_t;
	struct bone_list;

	inline void read(const char* file_name);
	inline void printjs(const char* gameobject_name, std::ofstream& js);
}

struct pmx::header_t {
	char  signature[5] = { 0 };
	float version;

	void load(std::ifstream& in) {
		in.read(signature, 4);
		in.read((char*)&version, 4);

		(*pmx::out) << "signature: " << signature << '\n';
		(*pmx::out) << "version  : " << version   << "\n\n";
	}

} header;

struct pmx::info_t {
	uint8_t data_count;
	uint8_t encoding_type;
	uint8_t additional_uv_count;

	void load(std::ifstream& in) {
		static const char* const symbols[] = { "UTF16", "UTF8" };
		in.read((char*)this, 3);

		(*pmx::out) << "data_count         : " << (uint32_t)data_count          << '\n';
		(*pmx::out) << "encoding_type      : " << symbols[encoding_type]        << '\n';
		(*pmx::out) << "additional_uv_count: " << (uint32_t)additional_uv_count << "\n\n";
	}

} info;

struct pmx::index_size_t {
	uint8_t vertex;
	uint8_t texture;
	uint8_t material;
	uint8_t bone;
	uint8_t morph;
	uint8_t rigid;

	void load(std::ifstream& in) {
		in.read((char*)this, 6);

		(*pmx::out) << "index_size for vertex   : " << (uint32_t) vertex   << '\n';
		(*pmx::out) << "index_size for texture  : " << (uint32_t) texture  << '\n';
		(*pmx::out) << "index_size for material : " << (uint32_t) material << '\n';
		(*pmx::out) << "index_size for bone     : " << (uint32_t) bone     << '\n';
		(*pmx::out) << "index_size for morph    : " << (uint32_t) morph    << '\n';
		(*pmx::out) << "index_size for rigid    : " << (uint32_t) rigid    << "\n\n";
	}

} index_size;

struct pmx::text {
	std::string data;

	void load(std::ifstream& in) {
		uint32_t size;
		union {
			uint16_t u16str[800];
			char     u8str[1600];
		};
		static int empty_count = 0;

		in.read((char*)&size, 4);

		if (size == 0) {
			data = std::string("unnamed") + std::to_string(empty_count++);
			return;
		}

		if (info.encoding_type == 0) { // for UTF16
			in.read((char*)u16str, size);
			size /= 2;

			for (unsigned i = 0; i < size;) {
				uint32_t code;

				i += utf16_to_code(u16str+i, code);
				code_to_utf8(code, data);
			}
		}
		else { // for UTF8
			in.read(u8str, size);
			data.assign(u8str, size);
		}
	}

	int utf16_to_code(const uint16_t* u16str, uint32_t& out) {
		uint32_t high, low;

		high = u16str[0];

		if (high > 0xD800) {
			low  = u16str[1];
			high = (high - 0xD800) * 0x400;
			out  = high + (low - 0xDC00) + 0x10000;
			return 2;
		}
		out = high;
		return 1;
	}

	void code_to_utf8(uint32_t code, std::string& out) {

		if (code <= 0x7f) { // 1-byte
			out += code;
		}
		else if (code <= 0x7ff) { // 2-byte
			out += (code >> 6) | 0xc0;
			out += (code & 0x3f) | 0x80;
		}
		else if (code <= 0xffff) { // 3-byte
			out += (code >> 12) | 0xe0;
			out += (code >> 6) & 0x3f | 0x80;
			out += (code & 0x3f) | 0x80;
		}
		else { // 4-byte
			out += (code >> 18) | 0xf0;
			out += (code >> 12) & 0x3f | 0x80;
			out += (code >> 6) & 0x3f | 0x80;
			out += (code & 0x3f) | 0x80;
		}
	}
};

std::ostream& operator<<(std::ostream& os, const pmx::text& t) {
	os << t.data;
	return os;
}

std::ostream& operator<<(std::ostream& os, const pmx::vec2& v) {
	os << "(" << v.x << "," << v.y << ")";
	return os;
}

std::ostream& operator<<(std::ostream& os, const pmx::vec3& v) {
	os << "(" << v.x << "," << v.y << "," << v.z << ")";
	return os;
}

std::ostream& operator<<(std::ostream& os, const pmx::vec4& v) {
	os << "(" << v.x << "," << v.y << "," << v.z << "," << v.w << ")";
	return os;
}

struct pmx::model_info_t {
	text local_character_name;
	text global_character_name;
	text local_comment;
	text global_comment;

	void load(std::ifstream& in) {
		local_character_name.load(in);
		global_character_name.load(in);
		local_comment.load(in);
		global_comment.load(in);

		(*pmx::out) << "local_character_name : " << local_character_name  << "\n";
		(*pmx::out) << "global_character_name: " << global_character_name << "\n\n";

		(*pmx::out) << "local_comment: \n-------------------------\n"  << local_comment  << "\n\n\n\n";
		(*pmx::out) << "global_comment: \n-------------------------\n" << global_comment << "\n\n\n\n";
	}

} model_info;

struct pmx::index_t {
	int32_t data;

	void load(std::ifstream& in, index_type type) {
		const uint8_t size = ((uint8_t*) &index_size) [(int)type];
		
		if (size == 1) {
			int8_t temp;
			in.read((char*)&temp, 1);
			data = temp;
		}
		else if (size == 2) {
			int16_t temp;
			in.read((char*)&temp, 2);
			data = temp;
		}
		else {
			int32_t temp;
			in.read((char*)&temp, 4);
			data = temp;
		}
	}
};

union pmx::weight_t {

	struct {
		index_t bone_index; // The weight of the bone will be 1.0

	} bdef1;

	struct {
		index_t bone_index1; // Uses Weight1
		index_t bone_index2; // Uses calculated Weight2
		float   weight1;     // Weight2 = (1.0 - Weight1)

	} bdef2;

	struct {
		index_t bone_index1; // Uses Weight1
		index_t bone_index2; // Uses Weight2
		index_t bone_index3; // Uses Weight3
		index_t bone_index4; // Uses Weight4

		float weight1;
		float weight2;
		float weight3;
		float weight4;

	} bdef4;

	struct {
		index_t bone_index1; // Uses Weight1
		index_t bone_index2; // Uses calculated Weight2
		float   weight1;     // Weight2 = (1.0 - Weight1)
		vec3    C, R0, R1;

	} sdef;

	void load(std::ifstream& in, weight_type type) {

		if (type == weight_type::BDEF1) {
			bdef1.bone_index.load(in, index_type::BONE);
		}
		else if (type == weight_type::BDEF2) {
			bdef2.bone_index1.load(in, index_type::BONE);
			bdef2.bone_index2.load(in, index_type::BONE);

			in.read((char*)&bdef2.weight1, 4);
		}
		else if (type == weight_type::BDEF4) {
			bdef4.bone_index1.load(in, index_type::BONE);
			bdef4.bone_index2.load(in, index_type::BONE);
			bdef4.bone_index3.load(in, index_type::BONE);
			bdef4.bone_index4.load(in, index_type::BONE);

			in.read((char*)&bdef4.weight1, 16);
		}
		else {
			sdef.bone_index1.load(in, index_type::BONE);
			sdef.bone_index2.load(in, index_type::BONE);

			in.read((char*)&sdef.C, 12);
			in.read((char*)&sdef.R0, 12);
			in.read((char*)&sdef.R1, 12);
		}
	}
};

struct pmx::vertex_list {
	uint32_t  count = 0;
	vertex_t* data  = nullptr;

	vec4*    additional_uvs       = nullptr; // vec4[N] * count
	uint32_t additional_uvs_count = 0;

	void load(std::ifstream& in);

} vertices;

struct pmx::vertex_t {
	vec3  position;
	vec3  normal;
	vec2  uv;
	vec4* additional_uv; // vec4[N]. N is info.additional_uv_count

	uint8_t  weight_type;
	weight_t weight;
	float    edge_scale;

	void load(std::ifstream& in) {
		const int N = info.additional_uv_count;

		in.read((char*)&position, 12);
		in.read((char*)&normal, 12);
		in.read((char*)&uv, 8);

		if (N > 0) {
			auto  additional_uvs     = vertices.additional_uvs;
			auto& additional_uvs_cnt = vertices.additional_uvs_count;

			additional_uv = &additional_uvs[additional_uvs_cnt];
			in.read((char*)additional_uv, 16 * N);
			additional_uvs_cnt += N;
		}
		in.read((char*)&weight_type, 1);
		weight.load(in, (pmx::weight_type) weight_type);

		in.read((char*)&edge_scale, 4);
	}
};

void pmx::vertex_list::load(std::ifstream& in) {
	const int N = info.additional_uv_count;

	in.read((char*)&count, 4);
	(*pmx::out) << "vertex count: " << count << "\n\n";

	if (count == 0) {
		return;
	}
	if (N > 0) {
		additional_uvs       = new vec4[N * count];
		additional_uvs_count = 0;
	}
	data = new vertex_t[count];

	for (uint32_t i = 0; i < count; ++i) {
		data[i].load(in);
	}
}

struct pmx::face_t {
	uint32_t vertex_index;

	void load(std::ifstream& in) {
		index_t index;

		index.load(in, index_type::VERTEX);
		vertex_index = index.data;
	}
};

struct pmx::face_list {
	uint32_t count = 0;
	face_t*  data  = nullptr;

	void load(std::ifstream& in) {
		in.read((char*)&count, 4);
		(*pmx::out) << "face count: " << count << "\n\n";

		if (count == 0) {
			return;
		}
		data = new face_t[count];

		for (uint32_t i = 0; i < count; ++i) {
			data[i].load(in);
		}
	}

} faces;

struct pmx::texture_t {
	text file_name;

	void load(std::ifstream& in) {
		file_name.load(in);
	}
};

struct pmx::texture_list {
	uint32_t   count = 0;
	texture_t* data  = nullptr;

	void load(std::ifstream& in) {
		in.read((char*)&count, 4);
		(*pmx::out) << "texture count: " << count << "\n\n";

		if (count == 0) {
			return;
		}
		data = new texture_t[count];

		for (uint32_t i = 0; i < count; ++i) {
			data[i].file_name.load(in);
			(*pmx::out) << data[i].file_name << '\n';
		}
	}

} textures;

struct pmx::material_t {
	text    local_name;        // Used as a high-level reference
	text    global_name;       // Used as a high-level reference
	vec4    diffuse_colour;    // RGBA base colour
	vec3    specular_colour;   // RGB specular reflection colour
	float   specularity;       // Specular strengh
	vec3    ambient_colour;    // RGB ambient shadow color
	uint8_t drawing_mode;      // Bit mask for "Drawing Modes"
	vec4    edge_colour;       // RGBA pencil line colour
	float   edge_size;         // How thick the pencil line is
	index_t texture_index;     // Material texture index
	index_t environment_index; // Enviroment map texture index
	uint8_t environment_mode;  // Environment modes

	uint8_t toon_flag;  // 0 = texture, 1 = inbuilt
	index_t toon_index; // toon index

	text    memo;       // extra information
	int32_t face_count; // how many faces this material affects

	void load(std::ifstream& in) {
		local_name.load(in);
		global_name.load(in);

		in.read((char*)&diffuse_colour, 16);
		in.read((char*)&specular_colour, 12);
		in.read((char*)&specularity, 4);
		in.read((char*)&ambient_colour, 12);
		in.read((char*)&drawing_mode, 1);
		in.read((char*)&edge_colour, 16);
		in.read((char*)&edge_size, 4);

		texture_index.load(in, index_type::TEXTURE);
		environment_index.load(in, index_type::TEXTURE);
		
		in.read((char*)&environment_mode, 1);
		in.read((char*)&toon_flag, 1);

		if (toon_flag == (uint8_t) toon_flag_type::TEXTURE) {
			toon_index.load(in, index_type::TEXTURE);
		}
		else {
			uint8_t temp;
			in.read((char*)&temp, 1);
			toon_index.data = temp;
		}
		memo.load(in);
		in.read((char*)&face_count, 4);

		(*pmx::out) << "local_name   : " << local_name         << '\n';
		(*pmx::out) << "global_name  : " << global_name        << '\n';
		(*pmx::out) << "texture_index: " << texture_index.data << '\n';
		(*pmx::out) << "face_count   : " << face_count         << "\n\n";
	}
};

struct pmx::material_list {
	uint32_t    count = 0;
	material_t* data  = nullptr;

	void load(std::ifstream& in) {
		in.read((char*)&count, 4);
		(*pmx::out) << "material count: " << count << '\n';

		if (count == 0) {
			return;
		}
		data = new material_t[count];

		for (uint32_t i = 0; i < count; ++i) {
			(*pmx::out) << "=========================\n";
			(*pmx::out) << "material " << i << ":\n";
			data[i].load(in);
		}
	}

} materials;

struct pmx::link_t {
	index_t ik_bone_index;
	int8_t  has_limit; // Boolean flag

	vec3 lower_limit; // Used when angle limit is 1
	vec3 upper_limit; // Used when angle limit is 1

	void load(std::ifstream& in) {
		ik_bone_index.load(in, index_type::BONE);
		in.read((char*)&has_limit, 1);

		if (has_limit == 1) {
			in.read((char*)&lower_limit, 12);
			in.read((char*)&upper_limit, 12);
		}
	}
};

struct pmx::bone_t {
	text    local_name;        // Used as a high-level reference
	text    global_name;       // Used as a high-level reference
	vec3    position;          // XYZ origin position
	index_t parent_bone_index; // Index this bone's parent
	int32_t transform_level;   // transform level
	int16_t bone_flag;         // Bit mask for bone flag

	// optional data depending on `bone_flag`
	union {
		index_t connection_index; // `CONNECTION` Flag Set
		vec3    position_offset;  // `CONNECTION` Flag Unset 
	};

	index_t additional_parent_index; // (ADD_ROTATION | ADD_MOVEMENT) Flag Set
	float   additional_rate;         // (ADD_ROTATION | ADD_MOVEMENT) Flag Set

	vec3 axis_vector; // `FIXED_AXIS` Flag Set

	vec3 x_axis_vector; // `LOCAL_AXIS` Flag Set
	vec3 z_axis_vector; // `LOCAL_AXIS` Flag Set

	int32_t key_value; // `EXTERNAL_PARENT_TRANSFORM` Flag Set

	index_t ik_bone_index; // `INV_KINEMATICS` Flag Set
	int32_t iterations;    // `INV_KINEMATICS` Flag Set
	float   limit_angle;   // `INV_KINEMATICS` Flag Set
	int32_t link_count;    // `INV_KINEMATICS` Flag Set
	link_t* links;         // `INV_KINEMATICS` Flag Set

	void load(std::ifstream& in) {
		local_name.load(in);
		global_name.load(in);

		in.read((char*)&position, 12);
		parent_bone_index.load(in, index_type::BONE);
		in.read((char*)&transform_level, 4);
		in.read((char*)&bone_flag, 2);

		// connection_index or position_offset
		if (bone_flag & CONNECTION) {
			connection_index.load(in, index_type::BONE);
		}
		else {
			in.read((char*)&position_offset, 12);
		}

		// additional_parent_index and additional_rate
		if (bone_flag & (ADD_ROTATION | ADD_MOVEMENT)) {
			additional_parent_index.load(in, index_type::BONE);
			in.read((char*)&additional_rate, 4);
		}

		// axis_vector
		if (bone_flag & FIXED_AXIS) {
			in.read((char*)&axis_vector, 12);
		}

		// x_axis_vector and z_axis_vector
		if (bone_flag & LOCAL_AXIS) {
			in.read((char*)&x_axis_vector, 12);
			in.read((char*)&z_axis_vector, 12);
		}

		// key_value
		if (bone_flag & EXTERNAL_PARENT_TRANSFORM) {
			in.read((char*)&key_value, 4); 
		}

		// ik_bone_index, iterations, limit_angle, link_count, links
		if (bone_flag & INV_KINEMATICS) {
			ik_bone_index.load(in, index_type::BONE);
			in.read((char*)&iterations, 4);
			in.read((char*)&limit_angle, 4);
			in.read((char*)&link_count, 4);

			(*pmx::out) << "link_count       : " << link_count << '\n';

			if (link_count > 0) {
				links = new link_t[link_count];

				for (int i = 0; i < link_count; ++i) {
					links[i].load(in);
				}
			}
		}

		(*pmx::out) << "local_name       : " << local_name             << '\n';
		(*pmx::out) << "global_name      : " << global_name            << '\n';
		(*pmx::out) << "position         : " << position               << '\n';
		(*pmx::out) << "bone_flag        : " << std::hex << bone_flag  << std::dec << '\n';
		(*pmx::out) << "parent_bone_index: " << parent_bone_index.data << "\n\n";
	}
};

struct pmx::bone_list {
	uint32_t count = 0;
	bone_t*  data  = nullptr;

	void load(std::ifstream& in) {
		in.read((char*)&count, 4);
		(*pmx::out) << "bone count: " << count << '\n';

		if (count == 0) {
			return;
		}
		data = new bone_t[count];

		for (uint32_t i = 0; i < count; ++i) {
			(*pmx::out) << "======================\n";
			(*pmx::out) << "bone " << i << ": \n";
			
			if (i == 6) {
				volatile int a = 10;

			}

			data[i].load(in);
		}
	}

} bones;

void pmx::read(const char* file_name) {
	std::ifstream in(file_name, std::ios::binary);

	SetConsoleOutputCP(65001);
	header.load(in);
	info.load(in);
	index_size.load(in);
	model_info.load(in);
	vertices.load(in);
	faces.load(in);
	textures.load(in);
	materials.load(in);
	bones.load(in);
}

void pmx::printjs(const char* gameobject_name, std::ofstream& js) {
	const std::string mesh = std::string(gameobject_name) + "Mesh";
	const std::string mat  = std::string(gameobject_name) + "Mat";
	const std::string tex  = std::string(gameobject_name) + "Tex";

	js << "import {GameEngine, Transform, Camera, GameObject, CircleCollider, BoxCollider, KeyCode, Bone} from \"./GameEngine.js\";\n"
	      "import {Vector2, Vector3, Vector4} from \"./MyMath.js\";\n"
		  "import * as MyMath from \"./MyMath.js\";\n"
		  "import {Renderer, Texture, Mesh, Weight, Color, Material} from \"./Renderer.js\";\n\n";

	js << "GameEngine.canvas = document.getElementById(\"canvas\");\n"
		  "GameEngine.setResolution(480, 270);\n"
		  "Camera.mainCamera.screenSize = GameEngine.getResolution();\n\n";

	js << "const " << gameobject_name << "     = GameObject.instantiate();\n";
	js << "const " << mesh << " = " << gameobject_name << ".renderer.mesh = new Mesh();\n\n";

	js << mesh << ".vertices = [\n";

	for (uint32_t i = 0; i < vertices.count; ++i) {
		auto& pos = vertices.data[i].position;
		js << "\tnew Vector3" << pos << ",\n";
	}

	js << "];\n" << mesh << ".indices = [\n";

	for (uint32_t i = 0; i < faces.count; i += 3) {
		auto index0 = faces.data[i].vertex_index;
		auto index1 = faces.data[i + 1].vertex_index;
		auto index2 = faces.data[i + 2].vertex_index;

		js << "\t" << index0 << ", " << index1 << ", " << index2;
		js << ", " << index0 << ", " << index1 << ", " << index2 << ",\n";
	}

	js << "];\n" << mesh << ".uvs = [\n";

	for (uint32_t i = 0; i < vertices.count; ++i) {
		auto& uv = vertices.data[i].uv;
		js << "\tnew Vector2" << uv << ",\n";
	}
	js << "];\n\n";

	for (int i = 0; i < materials.count; ++i) {
		js << "const " << mat << i << " = new Material();\n";
	}
	js << "\n";

	bool check[100]    = { 0 };
	int  inverter[100] = { 0 };
	int  tex_count     = 0;

	for (int i = 0; i < materials.count; ++i) {
		auto& m = materials.data[i];

		if (!check[m.texture_index.data]) {
			check[m.texture_index.data]    = true;
			inverter[m.texture_index.data] = tex_count++;
		}

		if (m.face_count > 0) {
			js << mat << i << ".triangleCount = " << m.face_count / 3 << ";\n";
		}
	}

	js << "\n" << gameobject_name << ".renderer.materials = [";

	for (int i = 0; i < materials.count; ++i) {
		js << mat << i;

		if (i + 1 != materials.count) {
			js << ", ";
		}
	}
	js << "];\n\n";

	for (int i = 0; i < tex_count; ++i) {
		js << "let " << tex << i << " = null;\n";
	}
	js << "\n" << mesh << ".bones = {\n";

	for (int i = 0; i < bones.count; ++i) {
		auto& b = bones.data[i];
		auto& pos = b.position;

		js << "\t\"" << b.global_name << "\" : new Bone(new Vector3";
		js << pos << "),\n";
	}

	js << "};\n\n//#region Bone Hierarchy\n\n";

	for (int i = 0; i < bones.count; ++i) {
		auto&   b            = bones.data[i];
		int32_t parent_index = b.parent_bone_index.data;
		auto&   parent       = bones.data[parent_index];

		if (parent_index < 0) { // -1 indicates root bone
			continue;
		}
		js << "\t" << mesh << ".bones[\"" << b.global_name << "\"].parent = " << mesh << ".bones[\"";
		js << parent.global_name << "\"]\n";
	}

	js << "\n//#endregion\n\n";

	int weight_type_count[4] = { 0 };

	for (int i = 0; i < vertices.count; ++i) {
		weight_type_count[vertices.data[i].weight_type]++;
	}
	(*pmx::out) << "bdef1_count: " << weight_type_count[0] << '\n';
	(*pmx::out) << "bdef2_count: " << weight_type_count[1] << '\n';
	(*pmx::out) << "bdef4_count: " << weight_type_count[2] << '\n';
	(*pmx::out) << "sdef_count : " << weight_type_count[3] << '\n';

	js << mesh << ".weights = [\n";

	for (int i = 0; i < faces.count; i += 3) {

		const vertex_t* triangle[] = {
			&vertices.data[faces.data[i].vertex_index],
			&vertices.data[faces.data[i].vertex_index],
			&vertices.data[faces.data[i].vertex_index]
		};

		js << '\t';

		for (int i = 0; i < 3; ++i) {
			auto& vertex = *triangle[i];

			js << "new Weight(";

			if (vertex.weight_type == (uint8_t)pmx::weight_type::BDEF1) {
				auto& bdef1 = vertex.weight.bdef1;
				auto& bone0 = bones.data[bdef1.bone_index.data];

				js << "[\"" << bone0.global_name << "\"], [1]";
			}
			else if (vertex.weight_type == (uint8_t)pmx::weight_type::BDEF2) {
				auto& bdef2 = vertex.weight.bdef2;
				auto& bone0 = bones.data[bdef2.bone_index1.data];
				auto& bone1 = bones.data[bdef2.bone_index2.data];

				js << "[";
				js << "\"" << bone0.global_name << "\", ";
				js << "\"" << bone1.global_name << "\"], [";

				js << bdef2.weight1 << "," << (1.f - bdef2.weight1) << "]";
			}
			else if (vertex.weight_type == (uint8_t)pmx::weight_type::BDEF4) {
				auto& bdef4 = vertex.weight.bdef4;
				auto& bone0 = bones.data[bdef4.bone_index1.data];
				auto& bone1 = bones.data[bdef4.bone_index2.data];
				auto& bone2 = bones.data[bdef4.bone_index3.data];
				auto& bone3 = bones.data[bdef4.bone_index4.data];

				js << "[";
				js << "\"" << bone0.global_name << "\", ";
				js << "\"" << bone1.global_name << "\", ";
				js << "\"" << bone2.global_name << "\", ";
				js << "\"" << bone3.global_name << "\"], [";

				js << bdef4.weight1 << ", ";
				js << bdef4.weight2 << ", ";
				js << bdef4.weight3 << ", ";
				js << bdef4.weight4 << "]";
			}
			js << "), ";
		}
		js << "\n";
	}

	js << "];\n\n";

	js << mesh << ".collider           = new BoxCollider(" << mesh << ");\n";
	js << mesh << ".boneVisible        = false;\n";
	js << gameobject_name << ".renderer.wireFrameMode = false;\n\n";

	js << "let rotation = Vector3.zero;\n";
	js << "let position = " << gameobject_name << ".transform.position = new Vector3(0,0,8);\n\n";


	js << "// update function example\n";
	js << gameobject_name << ".update = ()=>{\n";

	js << "\tconst deltaTime     = GameEngine.deltaTime;\n";
	js << "\tconst rotSpeed      = deltaTime * 360;\n";
	js << "\tconst moveSpeed     = deltaTime * 40;\n";
	js << "\tlet   rotationDirty = false;\n";
	js << "\tlet   positionDirty = false;\n\n";

	js << "\tif(GameEngine.getKeyUp(KeyCode.Alpha1)) ";
	js << gameobject_name << ".renderer.wireFrameMode = !" << gameobject_name << ".renderer.wireFrameMode;\n";

	js << "\tif(GameEngine.getKeyUp(KeyCode.Alpha2)) ";
	js << mesh << ".boneVisible        = !" << mesh << ".boneVisible;\n\n";

	js << "\tif (GameEngine.getKey(KeyCode.Left))  { rotation.y += rotSpeed; rotationDirty = true; }\n"
		  "\tif (GameEngine.getKey(KeyCode.Right)) { rotation.y -= rotSpeed; rotationDirty = true; }\n"
		  "\tif (GameEngine.getKey(KeyCode.Up))    { rotation.x += rotSpeed; rotationDirty = true; }\n"
		  "\tif (GameEngine.getKey(KeyCode.Down))  { rotation.x -= rotSpeed; rotationDirty = true; }\n\n";
	
	js << "\tif (GameEngine.getKey(KeyCode.W)) { position.z += moveSpeed; positionDirty = true; }\n"
	      "\tif (GameEngine.getKey(KeyCode.S)) { position.z -= moveSpeed; positionDirty = true; }\n"
	      "\tif (GameEngine.getKey(KeyCode.A)) { position.y -= moveSpeed; positionDirty = true; }\n"
	      "\tif (GameEngine.getKey(KeyCode.D)) { position.y += moveSpeed; positionDirty = true; }\n\n";
	
	js << "\tif(positionDirty) {\n";
	js << "\t\t" << gameobject_name << ".transform.position = position;\n\t}\n";

	js << "\tif(rotationDirty) {\n";
	js << "\t\t" << gameobject_name << ".transform.localRotation = rotation;\n\t}\n";

	js << "\tGameEngine.drawText(`deltaTime: ${deltaTime}`, 20, 20);\n"
	      "\tGameEngine.drawText(`position : ${position}`, 20, 30);\n"
	      "\tGameEngine.drawText(`rotation : ${rotation}`, 20, 40);\n"
	      "\tGameEngine.drawText(`boneVisible : ${" << mesh << ".boneVisible}`, 20, 50); \n"
	      "\tGameEngine.drawText(`wireFrameMode : ${" << gameobject_name << ".renderer.wireFrameMode}`, 20, 60);\n";

	js << "};\n\n";

	std::string tab;

	for (int i = 0, j = 0; i < 20; ++i) {
		if (check[i] == false) continue;

		auto& t = textures.data[i];

		js << tab << tex << j++ << " = new Texture(\"./resource/";
		js << t.file_name.data << "\", ";
		js << "()=>{\n";

		if (j == tex_count) {
			tab += '\t';

			for (int i = 0; i < materials.count; ++i) {
				auto& m       = materials.data[i];
				int   tex_num = inverter[m.texture_index.data];

				js << tab << mat << i << ".mainTex = " << tex << tex_num << ";\n";
			}
			js << tab << "GameEngine.initialize();\n";
			tab.pop_back();
			tab.pop_back();
		}
		tab += '\t';
	}

	for (int i = 0; i < tex_count; ++i) {
		js << tab << "});\n";

		if (tab.size() > 0) {
			tab.pop_back();
		}
	}
}
