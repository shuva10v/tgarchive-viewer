import {
	Box, Button,
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
import {useAlert} from "react-alert";

const API_ROOT = process.env.REACT_APP_API_ROOT;
const REFRESH_INTERVAL = 1000;

function TgAdmin() {
	const [archives, setArchives] = useState(undefined);
	const [sites, setSites] = useState(undefined);

	const alert = useAlert();

	useEffect(() => {
		if (archives === undefined) {
			fetch(API_ROOT + "/admin/archives")
				.then(response => response.json())
				.then(res => {
					setArchives(res);
					if (res.filter(arc => arc?.info?.state === 'running').length > 0) {
						setTimeout(() => setArchives(undefined), REFRESH_INTERVAL);
					}
				})
				.catch(error => alert.show("Ошибка при выполнении запроса: " + error));
		}
		if (sites === undefined) {
			fetch(API_ROOT + "/sites")
				.then(response => response.json())
				.then(res => setSites(res))
				.catch(error => alert.show("Ошибка при выполнении запроса: " + error));
		}
	}, [archives, sites])

	function reindex(file_name) {
		fetch(API_ROOT + '/admin/reindex', {
			method: 'POST',
			body: JSON.stringify({file_name: file_name}),
			headers: {
				'Content-Type': 'application/json'
			}
		})
			.then(response => response.json())
			.then(() => {
				alert.show("Запущена переиндексация")
				setTimeout(() => setArchives(undefined), REFRESH_INTERVAL);
			})
			.catch(error => alert.show("Ошибка при выполнении запроса: " + error));
	}

	if (archives === undefined || sites === undefined) {
		return <CircularProgress color="secondary"/>;
	}

	let sitesAndArchive = [];
	sites.forEach(site => {
		const archive = archives.filter(arc => arc.name === site.file_name.split("/").slice(-1)[0]).shift();
		site['size'] = archive?.size;
		sitesAndArchive.push(site);
	});
	archives.filter(arc => sitesAndArchive.filter(site => arc.name === site.file_name.split("/").slice(-1)[0]).length === 0)
		.forEach(archive => {
			sitesAndArchive.push({
				file_name: archive.name,
				size: archive.size,
				info: archive.info,
			})
	})

	return (<Box p={1}>
		<Box>
			<Typography variant="h6">Список архивов</Typography>
			<TableContainer component={Paper}>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>
								Название архива
							</TableCell>
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
						{sitesAndArchive.map((archive, key) => (
							<TableRow key={key}>
								<TableCell>{archive.name === undefined ? (archive?.info?.state !== undefined ? (
									<span style={{color:'blue'}}>{archive.info.state}: {archive.info.processed} / {archive.info.total}</span>
								) : (<span style={{color:'red'}}>Не индексировался</span>)) : archive.name}</TableCell>
								<TableCell>{archive.file_name}</TableCell>
								<TableCell>{archive.size ? prettyBytes(archive.size) : '?'}</TableCell>
								<TableCell>
									<Button
										variant="outlined"
										onClick={() => reindex(archive.file_name)}
									>Индексировать</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		</Box>
	</Box>)
}

export default TgAdmin;