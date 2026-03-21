import os
import json

# === 配置路径 ===
IMAGE_REL_PATH = 'static/images/dataset'
OUTPUT_JS = 'static/js/dataset_config.js'

def generate_config():
    # 1. 获取当前位置并检查
    cwd = os.getcwd()
    full_image_path = os.path.join(cwd, IMAGE_REL_PATH)

    print(f"--- 开始扫描: {full_image_path} ---")

    if not os.path.exists(full_image_path):
        print(f"❌ 错误: 找不到路径 {IMAGE_REL_PATH}")
        print("请检查你是否在项目根目录 (ProCap) 下运行脚本？")
        return

    data_map = {}
    folders = sorted([f for f in os.listdir(full_image_path) if os.path.isdir(os.path.join(full_image_path, f))])

    count_folders = 0
    for folder in folders:
        folder_path = os.path.join(full_image_path, folder)
        valid_exts = ('.jpg', '.jpeg', '.png', '.webp', '.gif')
        
        # 获取所有图片
        all_images = [f for f in os.listdir(folder_path) if f.lower().endswith(valid_exts)]
        
        if not all_images:
            continue

        # === 核心修改：排序逻辑 ===
        # 1. 找出以 'scene' 开头的图片 (比如 scene.jpg, scene_01.jpg)
        covers = [img for img in all_images if img.lower().startswith('scene')]
        
        # 2. 找出剩下的图片
        others = [img for img in all_images if not img.lower().startswith('scene')]
        
        # 3. 分别排序
        covers.sort() # 如果有多个 scene 开头，按字母排
        others.sort() # 其他图片也按字母排
        
        # 4. 合并：封面图强制排在最前面
        # 这样 JS 读取数组第0个元素时，自然就是 scene 图
        sorted_images = covers + others
        
        data_map[folder] = sorted_images
        count_folders += 1
        
        # 打印信息让我们知道它选了谁做封面
        first_img = sorted_images[0]
        print(f"[{folder}] 封面设定为 -> {first_img} (共 {len(sorted_images)} 张)")

    # 生成 JS 文件
    js_content = f"const DATASET_MANIFEST = {json.dumps(data_map, indent=4, ensure_ascii=False)};"
    
    os.makedirs(os.path.dirname(OUTPUT_JS), exist_ok=True)
    with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"\n✅ 成功！已处理 {count_folders} 个文件夹。")
    print(f"配置文件已更新: {OUTPUT_JS}")

if __name__ == '__main__':
    generate_config()