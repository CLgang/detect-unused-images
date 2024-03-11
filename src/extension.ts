import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand(
		'detect-unused-images.unusedImages',
		async () => {
			const rootPath = vscode.workspace.rootPath
			if (!rootPath) {
				vscode.window.showErrorMessage('No workspace is opened')
				return
			}
			const imageFiles = getImageFiles(rootPath)
			const codeFiles = await getCodeFiles(rootPath)
			const unusedImages: string[] = []
			const usedImages: string[] = []

			imageFiles.forEach((imageFile) => {
				const imageName = path.basename(imageFile)
				let hasFile = false

				for (let i = 0; i < codeFiles.length; i++) {
					const filePath = codeFiles[i]
					hasFile = checkImageNameInFile(filePath, imageName)

					if (hasFile) {
						usedImages.push(imageFile)
						break
					}
				}

				if (!hasFile) {
					unusedImages.push(imageFile)
				}
			})

			if (unusedImages.length > 0) {
				fs.writeFileSync(
					path.join(rootPath, 'used-images.txt'),
					usedImages.join('\n')
				)

				fs.writeFileSync(
					path.join(rootPath, 'unused-images.txt'),
					unusedImages.join('\n')
				)

				vscode.window
					.showInformationMessage(
						`Total images: ${imageFiles.length}, Used images: ${usedImages.length} Unused images: ${unusedImages.length}`,
						'Delete Unused Images'
					)
					.then((selection) => {
						if (selection === 'Delete Unused Images') {
							unusedImages.forEach((image) => fs.unlinkSync(image))
							vscode.window.showInformationMessage(
								'Unused images deleted successfully.'
							)
						}
					})
			} else {
				vscode.window.showInformationMessage('No unused images found')
			}
		}
	)

	context.subscriptions.push(disposable)
}

const getImageFiles = (rootPath: string): string[] => {
	const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg']
	let imageFiles: string[] = []

	function readImageFiles(dir: string) {
		const files = fs.readdirSync(dir)

		files.forEach((file) => {
			const filePath = path.join(dir, file)

			if (fs.statSync(filePath).isDirectory()) {
				readImageFiles(filePath)
			} else if (imageExtensions.includes(path.extname(file))) {
				imageFiles.push(filePath)
			}
		})
	}

	readImageFiles(rootPath)

	return imageFiles
}

const getCodeFiles = async (rootPath: string): Promise<string[]> => {
	let codeFiles: vscode.Uri[] = []

	codeFiles = await vscode.workspace.findFiles(
		'**/*.{html,js,jsx,ts,tsx,vue}',
		'**/node_modules/**'
	)

	return codeFiles.map((file: vscode.Uri) => file.path)
}

const checkImageNameInFile = (filePath: string, imageName: string): boolean => {
	const content = fs.readFileSync(filePath, 'utf-8')
	const regex = new RegExp(imageName, 'g')

	return regex.test(content)
}
