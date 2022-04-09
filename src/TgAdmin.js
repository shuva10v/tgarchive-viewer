import {
	Box,
	CircularProgress,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography
} from "@mui/material";
import {useEffect, useState} from "react";
import prettyBytes from "pretty-bytes";

const API_ROOT = process.env.REACT_APP_API_ROOT;

function TgAdmin() {
	const [archives, setArchives] = useState(undefined);

	useEffect(() => {
		if (archives === undefined) {
			fetch(API_ROOT + "/admin/archives")
				.then(response => response.json())
				.then(res => setArchives(res))
				.catch(error => alert.show("Ошибка при выполнении запроса: " + error));
		}
	}, [archives])

	if (archives === undefined) {
		return <CircularProgress color="secondary"/>;
	}

	return (<Box p={1}>
		<Box>
			<Typography variant="h6">Список архивов</Typography>
			<TableContainer component={Paper}>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>
								Имя файла
							</TableCell>
							<TableCell>
								Размер
							</TableCell>
							<TableCell>
								Действия
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{archives.map((archive, key) => (
							<TableRow key={key}>
								<TableCell>{archive.name}</TableCell>
								<TableCell>{prettyBytes(archive.size)}</TableCell>
								<TableCell>TODO</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		</Box>
	</Box>)
}

export default TgAdmin;